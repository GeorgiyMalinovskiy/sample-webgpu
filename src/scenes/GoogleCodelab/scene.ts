const GRID_SIZE = 50;
const WORKGROUP_SIZE = 8;
const UPDATE_INTERVAL = 200;
let step = 0;

export const init = async (canvas: HTMLCanvasElement) => {
  const context = canvas.getContext("webgpu");
  if (context) {
    const device = await initGpuDevice();
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
      device,
      format,
    });

    const vertices = new Float32Array([
      -0.8, -0.8, 0.8, -0.8, 0.8, 0.8, -0.8, -0.8, 0.8, 0.8, -0.8, 0.8,
    ]);
    const vertexBuffer = device.createBuffer({
      label: "Cell verticies",
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    device.queue.writeBuffer(vertexBuffer, /*bufferOffset=*/ 0, vertices);
    const vertexBufferLayout: GPUVertexBufferLayout = {
      arrayStride: 8,
      attributes: [
        {
          format: "float32x2",
          offset: 0,
          shaderLocation: 0, // Position, see vertex shader
        },
      ],
    };

    const uniformArray = new Float32Array([GRID_SIZE, GRID_SIZE]);
    const uniformBuffer = device.createBuffer({
      label: "Grid Uniforms",
      size: uniformArray.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(uniformBuffer, 0, uniformArray);

    const cellStateArray = new Uint32Array(GRID_SIZE * GRID_SIZE);
    const cellStateStorage = [
      device.createBuffer({
        label: "Cell state A",
        size: cellStateArray.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      }),
      device.createBuffer({
        label: "Cell state B",
        size: cellStateArray.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      }),
    ];

    for (let i = 0; i < cellStateArray.length - 1; ++i) {
      cellStateArray[i] = Math.random() > 0.6 ? 1 : 0;
    }
    device.queue.writeBuffer(cellStateStorage[0], 0, cellStateArray);

    for (let i = 0; i < cellStateArray.length; i += 4) {
      cellStateArray[i] = 1;
    }
    device.queue.writeBuffer(cellStateStorage[1], 0, cellStateArray);

    const cellShaderModule = device.createShaderModule({
      label: "Cell sharedr",
      code: `
      struct VertexInput {
        @location(0) pos: vec2f,
        @builtin(instance_index) instance: u32,
      };

      struct VertexOutput {
        @builtin(position) pos: vec4f,
        @location(0) cell: vec2f,
      };

      @group(0) @binding(0) var<uniform> grid: vec2f;
      @group(0) @binding(1) var<storage> cellStorage: array<u32>;

      @vertex
      fn vertexMain(input: VertexInput) -> VertexOutput {
        let i = f32(input.instance);
        let cell = vec2f(i % grid.x, floor(i / grid.x));
        let cellState = f32(cellStorage[input.instance]);

        let cellOffset = cell / grid * 2;
        let gridPos = (input.pos * cellState + 1) / grid - 1 + cellOffset;
        var output: VertexOutput;
        output.pos = vec4f(gridPos, 0, 1);
        output.cell = cell;

        return output;
      }

      struct FragInput {
        @location(0) cell: vec2f,
      }

      @fragment
      fn fragmentMain(input: FragInput) -> @location(0) vec4f {
        let c = input.cell / grid;
        return vec4f(c, 1 - c.x, 0.5); // Red, Green, Blue, Alpha
      }
      `,
    });

    const simulationShaderModule = device.createShaderModule({
      label: "Simulation shader",
      code: `
      @group(0) @binding(0) var<uniform> grid: vec2f;

      @group(0) @binding(1) var<storage> cellStateIn: array<u32>;
      @group(0) @binding(2) var<storage, read_write> cellStateOut: array<u32>;
  
      fn cellIndex(cell: vec2u) -> u32 {
        return (cell.y % u32(grid.y)) * u32(grid.x) +
                (cell.x % u32(grid.x));
      }
  
      fn cellActive(x: u32, y: u32) -> u32 {
        return cellStateIn[cellIndex(vec2(x, y))];
      }
  
      @compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
      fn computeMain(@builtin(global_invocation_id) cell: vec3u) {
        // Determine how many active neighbors this cell has.
        let activeNeighbors = cellActive(cell.x+1, cell.y+1) +
                              cellActive(cell.x+1, cell.y) +
                              cellActive(cell.x+1, cell.y-1) +
                              cellActive(cell.x, cell.y-1) +
                              cellActive(cell.x-1, cell.y-1) +
                              cellActive(cell.x-1, cell.y) +
                              cellActive(cell.x-1, cell.y+1) +
                              cellActive(cell.x, cell.y+1);
  
        let i = cellIndex(cell.xy);
  
        // Conway's game of life rules:
        switch activeNeighbors {
          case 2: {
            cellStateOut[i] = cellStateIn[i];
          }
          case 3: {
            cellStateOut[i] = 1;
          }
          default: {
            cellStateOut[i] = 0;
          }
        }
      }
      `,
    });

    const bindGroupLayout = device.createBindGroupLayout({
      label: "Cell Bind Group Layout",
      entries: [
        {
          binding: 0,
          visibility:
            GPUShaderStage.VERTEX |
            GPUShaderStage.FRAGMENT |
            GPUShaderStage.COMPUTE,
          buffer: {}, // Grid uniform buffer
        },
        {
          binding: 1,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
          buffer: { type: "read-only-storage" }, // Cell state input buffer
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage" }, // Cell state output buffer
        },
      ],
    });

    const bindGroups = [
      device.createBindGroup({
        label: "Cell render bind group A",
        layout: bindGroupLayout,
        entries: [
          {
            binding: 0,
            resource: { buffer: uniformBuffer },
          },
          {
            binding: 1,
            resource: { buffer: cellStateStorage[0] },
          },
          {
            binding: 2,
            resource: { buffer: cellStateStorage[1] },
          },
        ],
      }),
      device.createBindGroup({
        label: "Cell render bind group B",
        layout: bindGroupLayout,
        entries: [
          {
            binding: 0,
            resource: { buffer: uniformBuffer },
          },
          {
            binding: 1,
            resource: { buffer: cellStateStorage[1] },
          },
          {
            binding: 2,
            resource: { buffer: cellStateStorage[0] },
          },
        ],
      }),
    ];

    const pipelineLayout = device.createPipelineLayout({
      label: "Cell Pipeline Layout",
      bindGroupLayouts: [bindGroupLayout],
    });

    const renderPipeline = device.createRenderPipeline({
      label: "Cell pipeline",
      layout: pipelineLayout,
      vertex: {
        module: cellShaderModule,
        entryPoint: "vertexMain",
        buffers: [vertexBufferLayout],
      },
      fragment: {
        module: cellShaderModule,
        entryPoint: "fragmentMain",
        targets: [{ format }],
      },
    });

    const computePipeline = device.createComputePipeline({
      label: "Simulation pipeline",
      layout: pipelineLayout,
      compute: {
        module: simulationShaderModule,
        entryPoint: "computeMain",
      },
    });

    const updateGrid = () => {
      const encoder = device.createCommandEncoder();

      const computePass = encoder.beginComputePass();

      computePass.setPipeline(computePipeline);
      computePass.setBindGroup(0, bindGroups[step % 2]);

      const workgroupCount = Math.ceil(GRID_SIZE / WORKGROUP_SIZE);
      computePass.dispatchWorkgroups(workgroupCount, workgroupCount);

      computePass.end();

      step++;

      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: context.getCurrentTexture().createView(),
            loadOp: "clear",
            storeOp: "store",
            clearValue: { r: 0, g: 0, b: 0, a: 0.5 },
          },
        ],
      });

      pass.setPipeline(renderPipeline);
      pass.setVertexBuffer(0, vertexBuffer);
      pass.setBindGroup(0, bindGroups[step % 2]);
      pass.draw(vertices.length / 2, GRID_SIZE * GRID_SIZE);

      pass.end();

      // send command buffer to GPU
      device.queue.submit([encoder.finish()]);
    };

    setInterval(updateGrid, UPDATE_INTERVAL);
  }
};

async function initGpuDevice() {
  if (!navigator.gpu) {
    throw Error("WebGPU not supported.");
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw Error("Couldn't request WebGPU adapter.");
  }

  const device = await adapter.requestDevice();
  return device;
}
