"use client";

import { mat4, quat, vec2, vec3 } from "gl-matrix";
import { useEffect, useRef, useState } from "react";
import "./infinite-menu.css";

export type InfiniteMenuItem<T = unknown> = {
  image: string;
  title: string;
  description: string;
  meta?: string;
  value?: T;
};

const discVertexShader = `#version 300 es
uniform mat4 uWorldMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform vec4 uRotationAxisVelocity;

in vec3 aModelPosition;
in vec2 aModelUvs;
in mat4 aInstanceMatrix;

out vec2 vUvs;
out float vAlpha;
flat out int vInstanceId;

void main() {
  vec4 worldPosition = uWorldMatrix * aInstanceMatrix * vec4(aModelPosition, 1.0);
  vec3 centerPos = (uWorldMatrix * aInstanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float radius = length(centerPos);

  if (gl_VertexID > 0) {
    vec3 rotationAxis = uRotationAxisVelocity.xyz;
    float rotationVelocity = min(0.15, uRotationAxisVelocity.w * 15.0);
    vec3 stretchDir = normalize(cross(centerPos, rotationAxis));
    vec3 relativeVertexPos = normalize(worldPosition.xyz - centerPos);
    float strength = dot(stretchDir, relativeVertexPos);
    float invAbsStrength = min(0.0, abs(strength) - 1.0);
    strength = rotationVelocity * sign(strength) * abs(invAbsStrength * invAbsStrength * invAbsStrength + 1.0);
    worldPosition.xyz += stretchDir * strength;
  }

  worldPosition.xyz = radius * normalize(worldPosition.xyz);
  gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;
  vAlpha = smoothstep(0.5, 1.0, normalize(worldPosition.xyz).z) * 0.9 + 0.1;
  vUvs = aModelUvs;
  vInstanceId = gl_InstanceID;
}`;

const discFragmentShader = `#version 300 es
precision highp float;

uniform sampler2D uTex;
uniform int uItemCount;
uniform int uAtlasSize;

out vec4 outColor;
in vec2 vUvs;
in float vAlpha;
flat in int vInstanceId;

void main() {
  int itemIndex = vInstanceId % uItemCount;
  int cellX = itemIndex % uAtlasSize;
  int cellY = itemIndex / uAtlasSize;
  vec2 cellSize = vec2(1.0) / vec2(float(uAtlasSize));
  vec2 cellOffset = vec2(float(cellX), float(cellY)) * cellSize;
  vec2 st = vec2(vUvs.x, 1.0 - vUvs.y);
  st = clamp(st, 0.0, 1.0) * cellSize + cellOffset;
  outColor = texture(uTex, st);
  outColor.a *= vAlpha;
}`;

class Face {
  constructor(
    public a: number,
    public b: number,
    public c: number,
  ) {}
}

class Vertex {
  position: vec3;
  normal = vec3.create();
  uv = vec2.create();

  constructor(x: number, y: number, z: number) {
    this.position = vec3.fromValues(x, y, z);
  }
}

class Geometry {
  vertices: Vertex[] = [];
  faces: Face[] = [];

  addVertex(...values: number[]) {
    for (let index = 0; index < values.length; index += 3) {
      this.vertices.push(new Vertex(values[index], values[index + 1], values[index + 2]));
    }
    return this;
  }

  addFace(...values: number[]) {
    for (let index = 0; index < values.length; index += 3) {
      this.faces.push(new Face(values[index], values[index + 1], values[index + 2]));
    }
    return this;
  }

  get lastVertex() {
    return this.vertices[this.vertices.length - 1];
  }

  getMidPoint(indexA: number, indexB: number, cache: Record<string, number>) {
    const cacheKey = indexA < indexB ? `k_${indexB}_${indexA}` : `k_${indexA}_${indexB}`;
    if (Object.prototype.hasOwnProperty.call(cache, cacheKey)) return cache[cacheKey];
    const a = this.vertices[indexA].position;
    const b = this.vertices[indexB].position;
    const index = this.vertices.length;
    cache[cacheKey] = index;
    this.addVertex((a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, (a[2] + b[2]) * 0.5);
    return index;
  }

  subdivide(divisions = 1) {
    const midpointCache: Record<string, number> = {};
    let faces = this.faces;
    for (let division = 0; division < divisions; division += 1) {
      const nextFaces = new Array<Face>(faces.length * 4);
      faces.forEach((face, index) => {
        const ab = this.getMidPoint(face.a, face.b, midpointCache);
        const bc = this.getMidPoint(face.b, face.c, midpointCache);
        const ca = this.getMidPoint(face.c, face.a, midpointCache);
        const offset = index * 4;
        nextFaces[offset] = new Face(face.a, ab, ca);
        nextFaces[offset + 1] = new Face(face.b, bc, ab);
        nextFaces[offset + 2] = new Face(face.c, ca, bc);
        nextFaces[offset + 3] = new Face(ab, bc, ca);
      });
      faces = nextFaces;
    }
    this.faces = faces;
    return this;
  }

  spherize(radius = 1) {
    this.vertices.forEach((vertex) => {
      vec3.normalize(vertex.normal, vertex.position);
      vec3.scale(vertex.position, vertex.normal, radius);
    });
    return this;
  }

  get vertexData() {
    return new Float32Array(this.vertices.flatMap((vertex) => Array.from(vertex.position)));
  }

  get uvData() {
    return new Float32Array(this.vertices.flatMap((vertex) => Array.from(vertex.uv)));
  }

  get indexData() {
    return new Uint16Array(this.faces.flatMap((face) => [face.a, face.b, face.c]));
  }
}

class IcosahedronGeometry extends Geometry {
  constructor() {
    super();
    const t = Math.sqrt(5) * 0.5 + 0.5;
    this.addVertex(
      -1, t, 0, 1, t, 0, -1, -t, 0, 1, -t, 0,
      0, -1, t, 0, 1, t, 0, -1, -t, 0, 1, -t,
      t, 0, -1, t, 0, 1, -t, 0, -1, -t, 0, 1,
    ).addFace(
      0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11,
      1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8,
      3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9,
      4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1,
    );
  }
}

class DiscGeometry extends Geometry {
  constructor(steps = 56, radius = 1) {
    super();
    const count = Math.max(4, steps);
    const angleStep = (Math.PI * 2) / count;
    this.addVertex(0, 0, 0);
    this.lastVertex.uv[0] = 0.5;
    this.lastVertex.uv[1] = 0.5;
    for (let index = 0; index < count; index += 1) {
      const x = Math.cos(angleStep * index);
      const y = Math.sin(angleStep * index);
      this.addVertex(radius * x, radius * y, 0);
      this.lastVertex.uv[0] = x * 0.5 + 0.5;
      this.lastVertex.uv[1] = y * 0.5 + 0.5;
      if (index > 0) this.addFace(0, index, index + 1);
    }
    this.addFace(0, count, 1);
  }
}

function createShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to create InfiniteMenu shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || "InfiniteMenu shader compilation failed";
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function createProgram(gl: WebGL2RenderingContext) {
  const program = gl.createProgram();
  if (!program) throw new Error("Unable to create InfiniteMenu program");
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, discVertexShader);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, discFragmentShader);
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.bindAttribLocation(program, 0, "aModelPosition");
  gl.bindAttribLocation(program, 1, "aModelUvs");
  gl.bindAttribLocation(program, 2, "aInstanceMatrix");
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || "InfiniteMenu program link failed";
    gl.deleteProgram(program);
    throw new Error(message);
  }
  return program;
}

function makeBuffer(gl: WebGL2RenderingContext, data: BufferSource, usage: number) {
  const buffer = gl.createBuffer();
  if (!buffer) throw new Error("Unable to create InfiniteMenu buffer");
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, usage);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  return buffer;
}

class ArcballControl {
  isPointerDown = false;
  orientation = quat.create();
  pointerRotation = quat.create();
  rotationVelocity = 0;
  rotationAxis = vec3.fromValues(1, 0, 0);
  snapDirection = vec3.fromValues(0, 0, -1);
  snapTargetDirection?: vec3;
  private pointerPosition = vec2.create();
  private previousPointerPosition = vec2.create();
  private combinedQuaternion = quat.create();
  private smoothedVelocity = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private updateCallback: (deltaTime: number) => void,
  ) {
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerUp);
    canvas.addEventListener("pointerleave", this.onPointerUp);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.style.touchAction = "none";
  }

  private onPointerDown = (event: PointerEvent) => {
    this.canvas.setPointerCapture?.(event.pointerId);
    vec2.set(this.pointerPosition, event.clientX, event.clientY);
    vec2.copy(this.previousPointerPosition, this.pointerPosition);
    this.isPointerDown = true;
  };

  private onPointerUp = (event: PointerEvent) => {
    this.canvas.releasePointerCapture?.(event.pointerId);
    this.isPointerDown = false;
  };

  private onPointerMove = (event: PointerEvent) => {
    if (this.isPointerDown) vec2.set(this.pointerPosition, event.clientX, event.clientY);
  };

  destroy() {
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerUp);
    this.canvas.removeEventListener("pointerleave", this.onPointerUp);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
  }

  update(deltaTime: number, targetFrameDuration = 16) {
    const timeScale = deltaTime / targetFrameDuration + 0.00001;
    let angleFactor = timeScale;
    const snapRotation = quat.create();

    if (this.isPointerDown) {
      const intensity = 0.3 * timeScale;
      const amplification = 5 / timeScale;
      const mid = vec2.sub(vec2.create(), this.pointerPosition, this.previousPointerPosition);
      vec2.scale(mid, mid, intensity);
      if (vec2.sqrLen(mid) > 0.1) {
        vec2.add(mid, this.previousPointerPosition, mid);
        const a = vec3.normalize(vec3.create(), this.project(mid));
        const b = vec3.normalize(vec3.create(), this.project(this.previousPointerPosition));
        vec2.copy(this.previousPointerPosition, mid);
        angleFactor *= amplification;
        this.quaternionFromVectors(a, b, this.pointerRotation, angleFactor);
      } else {
        quat.slerp(this.pointerRotation, this.pointerRotation, quat.create(), intensity);
      }
    } else {
      quat.slerp(this.pointerRotation, this.pointerRotation, quat.create(), 0.1 * timeScale);
      if (this.snapTargetDirection) {
        const squaredDistance = vec3.squaredDistance(this.snapTargetDirection, this.snapDirection);
        const distanceFactor = Math.max(0.1, 1 - squaredDistance * 10);
        angleFactor *= 0.2 * distanceFactor;
        this.quaternionFromVectors(this.snapTargetDirection, this.snapDirection, snapRotation, angleFactor);
      }
    }

    const combined = quat.multiply(quat.create(), snapRotation, this.pointerRotation);
    quat.multiply(this.orientation, combined, this.orientation);
    quat.normalize(this.orientation, this.orientation);
    quat.slerp(this.combinedQuaternion, this.combinedQuaternion, combined, 0.8 * timeScale);
    quat.normalize(this.combinedQuaternion, this.combinedQuaternion);

    const radians = Math.acos(Math.min(1, this.combinedQuaternion[3])) * 2;
    const sine = Math.sin(radians / 2);
    let rotationVelocity = 0;
    if (sine > 0.000001) {
      rotationVelocity = radians / (Math.PI * 2);
      this.rotationAxis[0] = this.combinedQuaternion[0] / sine;
      this.rotationAxis[1] = this.combinedQuaternion[1] / sine;
      this.rotationAxis[2] = this.combinedQuaternion[2] / sine;
    }
    this.smoothedVelocity += (rotationVelocity - this.smoothedVelocity) * 0.5 * timeScale;
    this.rotationVelocity = this.smoothedVelocity / timeScale;
    this.updateCallback(deltaTime);
  }

  private quaternionFromVectors(a: vec3, b: vec3, output: quat, angleFactor: number) {
    const axis = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), a, b));
    const dot = Math.max(-1, Math.min(1, vec3.dot(a, b)));
    quat.setAxisAngle(output, axis, Math.acos(dot) * angleFactor);
  }

  private project(position: vec2) {
    const radius = 2;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const size = Math.max(width, height) - 1;
    const x = (2 * position[0] - width - 1) / size;
    const y = (2 * position[1] - height - 1) / size;
    const squared = x * x + y * y;
    const radiusSquared = radius * radius;
    const z = squared <= radiusSquared / 2 ? Math.sqrt(radiusSquared - squared) : radiusSquared / Math.sqrt(squared);
    return vec3.fromValues(-x, y, z);
  }
}

class InfiniteGridMenu<T> {
  private readonly targetFrameDuration = 1000 / 60;
  private readonly sphereRadius = 2;
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private indexBuffer: WebGLBuffer;
  private instanceBuffer: WebGLBuffer;
  private texture: WebGLTexture;
  private control: ArcballControl;
  private instancePositions: vec3[];
  private instanceMatrices: Float32Array[] = [];
  private matricesArray: Float32Array;
  private indexCount: number;
  private atlasSize: number;
  private worldMatrix = mat4.create();
  private viewMatrix = mat4.create();
  private projectionMatrix = mat4.create();
  private cameraPosition = vec3.fromValues(0, 0, 3);
  private cameraMatrix = mat4.create();
  private previousTime = 0;
  private smoothedRotationVelocity = 0;
  private movementActive = false;
  private enabled = true;
  private frameId = 0;
  private destroyed = false;
  private activeItem = -1;
  private resizeObserver: ResizeObserver;

  constructor(
    private canvas: HTMLCanvasElement,
    private items: InfiniteMenuItem<T>[],
    private onActiveItemChange: (index: number) => void,
    private onMovementChange: (moving: boolean) => void,
    private scaleFactor = 1,
  ) {
    const gl = canvas.getContext("webgl2", {
      antialias: true,
      alpha: true,
      premultipliedAlpha: false,
      powerPreference: "high-performance",
    });
    if (!gl) throw new Error("WebGL 2 is required for InfiniteMenu");
    this.gl = gl;
    this.program = createProgram(gl);

    const disc = new DiscGeometry(56, 1);
    const vertexData = disc.vertexData;
    const uvData = disc.uvData;
    const indexData = disc.indexData;
    this.indexCount = indexData.length;

    const vao = gl.createVertexArray();
    const indexBuffer = gl.createBuffer();
    const instanceBuffer = gl.createBuffer();
    if (!vao || !indexBuffer || !instanceBuffer) throw new Error("Unable to create InfiniteMenu geometry");
    this.vao = vao;
    this.indexBuffer = indexBuffer;
    this.instanceBuffer = instanceBuffer;

    gl.bindVertexArray(vao);
    const vertexBuffer = makeBuffer(gl, vertexData, gl.STATIC_DRAW);
    const uvBuffer = makeBuffer(gl, uvData, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexData, gl.STATIC_DRAW);

    const icosahedron = new IcosahedronGeometry().subdivide(1).spherize(this.sphereRadius);
    this.instancePositions = icosahedron.vertices.map((vertex) => vertex.position);
    this.matricesArray = new Float32Array(this.instancePositions.length * 16);
    for (let index = 0; index < this.instancePositions.length; index += 1) {
      this.instanceMatrices.push(new Float32Array(this.matricesArray.buffer, index * 64, 16));
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.matricesArray.byteLength, gl.DYNAMIC_DRAW);
    for (let column = 0; column < 4; column += 1) {
      const location = 2 + column;
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, 4, gl.FLOAT, false, 64, column * 16);
      gl.vertexAttribDivisor(location, 1);
    }
    gl.bindVertexArray(null);

    const texture = gl.createTexture();
    if (!texture) throw new Error("Unable to create InfiniteMenu texture");
    this.texture = texture;
    this.atlasSize = Math.ceil(Math.sqrt(Math.max(1, items.length)));
    this.initializeTexture();

    this.cameraPosition[2] = 3 * scaleFactor;
    this.control = new ArcballControl(canvas, (delta) => this.onControlUpdate(delta));
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
    this.frameId = requestAnimationFrame(this.run);
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.frameId);
    this.resizeObserver.disconnect();
    this.control.destroy();
    this.gl.deleteTexture(this.texture);
    this.gl.deleteBuffer(this.indexBuffer);
    this.gl.deleteBuffer(this.instanceBuffer);
    this.gl.deleteVertexArray(this.vao);
    this.gl.deleteProgram(this.program);
  }

  private initializeTexture() {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([10, 12, 20, 255]));

    const cellSize = 512;
    const atlas = document.createElement("canvas");
    atlas.width = this.atlasSize * cellSize;
    atlas.height = this.atlasSize * cellSize;
    const context = atlas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#080a12";
    context.fillRect(0, 0, atlas.width, atlas.height);

    Promise.all(
      this.items.map(
        (item) => new Promise<HTMLImageElement | null>((resolve) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () => resolve(null);
          image.src = item.image;
        }),
      ),
    ).then((images) => {
      if (this.destroyed) return;
      images.forEach((image, index) => {
        if (!image) return;
        const x = (index % this.atlasSize) * cellSize;
        const y = Math.floor(index / this.atlasSize) * cellSize;
        const scale = Math.max(cellSize / image.naturalWidth, cellSize / image.naturalHeight);
        const width = image.naturalWidth * scale;
        const height = image.naturalHeight * scale;
        context.save();
        context.beginPath();
        context.rect(x, y, cellSize, cellSize);
        context.clip();
        context.drawImage(image, x + (cellSize - width) / 2, y + (cellSize - height) / 2, width, height);
        context.restore();
      });
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
      gl.generateMipmap(gl.TEXTURE_2D);
    });
  }

  private resize() {
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    const height = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.gl.viewport(0, 0, width, height);
    const aspect = this.canvas.clientWidth / Math.max(1, this.canvas.clientHeight);
    const visibleHeight = this.sphereRadius * 0.35;
    const distance = this.cameraPosition[2];
    const fov = aspect > 1
      ? 2 * Math.atan(visibleHeight / distance)
      : 2 * Math.atan(visibleHeight / aspect / distance);
    mat4.perspective(this.projectionMatrix, fov, aspect, 0.1, 40);
    this.updateCameraMatrix();
  }

  private run = (time = 0) => {
    if (this.destroyed) return;
    const delta = Math.min(32, this.previousTime ? time - this.previousTime : this.targetFrameDuration);
    this.previousTime = time;
    if (this.enabled) {
      this.animate(delta);
      this.render();
    }
    this.frameId = requestAnimationFrame(this.run);
  };

  private animate(deltaTime: number) {
    const gl = this.gl;
    this.control.update(deltaTime, this.targetFrameDuration);
    const positions = this.instancePositions.map((position) =>
      vec3.transformQuat(vec3.create(), position, this.control.orientation),
    );
    const discScale = 0.25;
    positions.forEach((position, index) => {
      const depthScale = (Math.abs(position[2]) / this.sphereRadius) * 0.6 + 0.4;
      const matrix = mat4.create();
      mat4.translate(matrix, matrix, vec3.negate(vec3.create(), position));
      mat4.multiply(matrix, matrix, mat4.targetTo(mat4.create(), [0, 0, 0], position, [0, 1, 0]));
      mat4.scale(matrix, matrix, [depthScale * discScale, depthScale * discScale, depthScale * discScale]);
      mat4.translate(matrix, matrix, [0, 0, -this.sphereRadius]);
      mat4.copy(this.instanceMatrices[index] as mat4, matrix);
    });
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.matricesArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    this.smoothedRotationVelocity = this.control.rotationVelocity;
  }

  private render() {
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, "uWorldMatrix"), false, this.worldMatrix);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, "uViewMatrix"), false, this.viewMatrix);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, "uProjectionMatrix"), false, this.projectionMatrix);
    gl.uniform4f(
      gl.getUniformLocation(this.program, "uRotationAxisVelocity"),
      this.control.rotationAxis[0],
      this.control.rotationAxis[1],
      this.control.rotationAxis[2],
      this.smoothedRotationVelocity * 1.1,
    );
    gl.uniform1i(gl.getUniformLocation(this.program, "uItemCount"), this.items.length);
    gl.uniform1i(gl.getUniformLocation(this.program, "uAtlasSize"), this.atlasSize);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(gl.getUniformLocation(this.program, "uTex"), 0);
    gl.bindVertexArray(this.vao);
    gl.drawElementsInstanced(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0, this.instancePositions.length);
    gl.bindVertexArray(null);
  }

  private onControlUpdate(deltaTime: number) {
    const timeScale = deltaTime / this.targetFrameDuration + 0.0001;
    let damping = 5 / timeScale;
    let cameraTargetZ = 3 * this.scaleFactor;
    const moving = this.control.isPointerDown || Math.abs(this.smoothedRotationVelocity) > 0.01;
    if (moving !== this.movementActive) {
      this.movementActive = moving;
      this.onMovementChange(moving);
    }
    if (!this.control.isPointerDown) {
      const nearest = this.findNearestVertexIndex();
      const itemIndex = nearest % Math.max(1, this.items.length);
      if (itemIndex !== this.activeItem) {
        this.activeItem = itemIndex;
        this.onActiveItemChange(itemIndex);
      }
      this.control.snapTargetDirection = vec3.normalize(
        vec3.create(),
        vec3.transformQuat(vec3.create(), this.instancePositions[nearest], this.control.orientation),
      );
    } else {
      cameraTargetZ += this.control.rotationVelocity * 80 + 2.5;
      damping = 7 / timeScale;
    }
    this.cameraPosition[2] += (cameraTargetZ - this.cameraPosition[2]) / damping;
    this.updateCameraMatrix();
  }

  private findNearestVertexIndex() {
    const inverse = quat.conjugate(quat.create(), this.control.orientation);
    const target = vec3.transformQuat(vec3.create(), this.control.snapDirection, inverse);
    let nearest = 0;
    let maximum = -Infinity;
    this.instancePositions.forEach((position, index) => {
      const dot = vec3.dot(target, position);
      if (dot > maximum) {
        maximum = dot;
        nearest = index;
      }
    });
    return nearest;
  }

  private updateCameraMatrix() {
    mat4.targetTo(this.cameraMatrix, this.cameraPosition, [0, 0, 0], [0, 1, 0]);
    mat4.invert(this.viewMatrix, this.cameraMatrix);
  }
}

export default function InfiniteMenu<T>({
  items,
  scale = 1,
  onItemClick,
  actionLabel = "Open project",
}: {
  items: InfiniteMenuItem<T>[];
  scale?: number;
  onItemClick?: (item: InfiniteMenuItem<T>) => void;
  actionLabel?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const shell = shellRef.current;
    if (!canvas || !shell || !items.length) return;
    const menu = new InfiniteGridMenu(canvas, items, setActiveIndex, setIsMoving, scale);
    const observer = new IntersectionObserver(
      ([entry]) => menu.setEnabled(entry.isIntersecting),
      { rootMargin: "180px" },
    );
    observer.observe(shell);
    return () => {
      observer.disconnect();
      menu.destroy();
    };
  }, [items, scale]);

  if (!items.length) return null;
  const activeItem = items[activeIndex % items.length];

  return (
    <div ref={shellRef} className="infinite-menu-shell">
      <canvas ref={canvasRef} className="infinite-menu-canvas" aria-label="Interactive project menu" />
      <div className={`infinite-menu-copy ${isMoving ? "is-moving" : ""}`}>
        <div>
          <span className="infinite-menu-index">
            {String(activeIndex + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
          </span>
          <h2>{activeItem.title}</h2>
        </div>
        <p>{activeItem.description}</p>
      </div>
      <button
        type="button"
        className={`infinite-menu-action ${isMoving ? "is-moving" : ""}`}
        onClick={() => onItemClick?.(activeItem)}
        aria-label={`${actionLabel}: ${activeItem.title}`}
      >
        <span aria-hidden="true">↗</span>
      </button>
      <div className="infinite-menu-hint" aria-hidden="true">
        <span /> Drag to explore
      </div>
    </div>
  );
}
