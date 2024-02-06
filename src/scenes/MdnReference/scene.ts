// Shaders
const shaders = `
struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
}

@vertex
fn vertex_main(
  @location(0) position: vec4f,
  @location(1) color: vec4f
) -> VertexOut {
  var output: VertexOut;
  output.position = position;
  output.color = color;
  return output;
}

@fragment
fn fragment_main(fragData: VertexOut) -> @location(0) vec4f {
  return fragData.color;
}
`;

export async function init(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("webgpu");
  if (!context || !navigator.gpu) {
    throw Error("WebGPU not supported.");
  }

  // Get GPU interface
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw Error("Couldn't request WebGPU adapter.");
  }

  const device = await adapter.requestDevice();

  // Configure output
  context.configure({
    device,
    format: navigator.gpu.getPreferredCanvasFormat(),
    alphaMode: "premultiplied",
  });

  // Create resources (textures, buffers)
  const shaderModule = device.createShaderModule({
    label: "Base shader module",
    code: shaders,
  });

  const vertices = new Float32Array([
    0.0, 0.6, 0, 1, 1, 0, 0, 1, -0.5, -0.6, 0, 1, 0, 1, 0, 1, 0.5, -0.6, 0, 1,
    0, 0, 1, 1,
  ]);

  const vertexBuffer = device.createBuffer({
    label: "Vertext buffer",
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  const output = device.createBuffer({
    label: "Output buffer",
    size: vertices.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });

  const stagingBuffer = device.createBuffer({
    label: "Staging buffer",
    size: vertices.byteLength,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });

  device.queue.writeBuffer(vertexBuffer, 0, vertices, 0, vertices.length);

  // Create pipelines
  const vertexBuffers: GPUVertexBufferLayout[] = [
    {
      attributes: [
        {
          shaderLocation: 0,
          offset: 0,
          format: "float32x4",
        },
        {
          shaderLocation: 1,
          offset: 16,
          format: "float32x4",
        },
      ],
      arrayStride: 32,
      stepMode: "vertex",
    },
  ];

  const pipelineDescriptor: GPURenderPipelineDescriptor = {
    vertex: {
      module: shaderModule,
      entryPoint: "vertex_main",
      buffers: vertexBuffers,
    },
    fragment: {
      module: shaderModule,
      entryPoint: "fragment_main",
      targets: [
        {
          format: navigator.gpu.getPreferredCanvasFormat(),
        },
      ],
    },
    primitive: {
      topology: "triangle-list",
    },
    layout: "auto",
  };

  const renderPipeline = device.createRenderPipeline(pipelineDescriptor);

  // Create GPUCommandEncoder
  const commandEncoder = device.createCommandEncoder();

  // Run computation/rendering pass
  // Create pass encoder
  const clearColor = { r: 0.0, g: 0.5, b: 1.0, a: 1.0 };
  const renderPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        clearValue: clearColor,
        loadOp: "clear",
        storeOp: "store",
        view: context.getCurrentTexture().createView(), // where to ouput created texture
      },
    ],
  };

  const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

  // Run commands
  passEncoder.setPipeline(renderPipeline);
  passEncoder.setVertexBuffer(0, vertexBuffer);
  passEncoder.draw(vertices.length / 8);

  // Finalize the command list and encapsulate command buffer
  passEncoder.end();
  // const commandBuffer = commandEncoder.finish();

  // Submit command buffers to the GPU
  device.queue.submit([commandEncoder.finish()]);
}
