const DEFAULT_OPTIONS = {
  initialYaw: 0,
  initialPitch: 0,
  initialFov: null,
  minFov: 40,
  maxFov: 90,
  inertia: 0.9,
  rotateSpeed: 0.003,
  clickThreshold: 8,
  markerInteraction: false,
  onClick: null,
  onMarkerClick: null
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function wrapAngle(angle) {
  const twoPi = Math.PI * 2;
  let result = angle % twoPi;
  if (result <= -Math.PI) result += twoPi;
  if (result > Math.PI) result -= twoPi;
  return result;
}

function isPowerOfTwo(value) {
  return (value & (value - 1)) === 0;
}

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(info || 'Falha ao compilar shader');
  }
  return shader;
}

function createProgram(gl, vertexShaderSource, fragmentShaderSource) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(info || 'Falha ao criar programa WebGL');
  }
  return program;
}

function createProjectionMatrix(fov, aspect, near = 0.1, far = 1000) {
  const fovRad = (fov * Math.PI) / 180;
  const f = 1 / Math.tan(fovRad / 2);
  const nf = 1 / (near - far);
  return new Float32Array([
    f / aspect,
    0,
    0,
    0,
    0,
    f,
    0,
    0,
    0,
    0,
    (far + near) * nf,
    -1,
    0,
    0,
    (2 * far * near) * nf,
    0
  ]);
}

function multiplyMatrices(a, b) {
  const result = new Float32Array(16);
  for (let column = 0; column < 4; column++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let i = 0; i < 4; i++) {
        sum += a[row + i * 4] * b[i + column * 4];
      }
      result[row + column * 4] = sum;
    }
  }
  return result;
}

function directionFromAngles(yaw, pitch) {
  const cosPitch = Math.cos(pitch);
  return [
    Math.sin(yaw) * cosPitch,
    Math.sin(pitch),
    Math.cos(yaw) * cosPitch
  ];
}

function normalizeVector([x, y, z]) {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}

function applyCameraRotation(vector, yaw, pitch) {
  const [vx, vy, vz] = vector;
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);

  const x = cosYaw * vx + sinYaw * sinPitch * vy + sinYaw * cosPitch * vz;
  const y = cosPitch * vy - sinPitch * vz;
  const z = -sinYaw * vx + cosYaw * sinPitch * vy + cosYaw * cosPitch * vz;
  return [x, y, z];
}

function transformDirection(matrix, direction) {
  const [x, y, z] = direction;
  const nx = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12];
  const ny = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13];
  const nz = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14];
  const nw = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15];
  return [nx, ny, nz, nw];
}

export class PanoramaViewer {
  constructor(container, options = {}) {
    if (!container) {
      throw new Error('Container não informado para o viewer 360º');
    }
    this.container = container;
    this.options = { ...DEFAULT_OPTIONS, ...options };

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'viewer-360-canvas';
    this.container.innerHTML = '';
    this.container.appendChild(this.canvas);

    this.markerLayer = document.createElement('div');
    this.markerLayer.className = 'viewer-360-markers';
    this.container.appendChild(this.markerLayer);

    this.tooltip = document.createElement('div');
    this.tooltip.className = 'viewer-360-tooltip';
    this.tooltip.style.display = 'none';
    this.markerLayer.appendChild(this.tooltip);

    this.gl = this.canvas.getContext('webgl', { antialias: true, preserveDrawingBuffer: true });
    if (!this.gl) {
      throw new Error('WebGL não suportado pelo navegador');
    }

    this.program = null;
    this.buffers = {};
    this.texture = null;
    this.image = null;

    this.yaw = this.options.initialYaw;
    this.pitch = this.options.initialPitch;
    const startingFov = this.options.initialFov ?? this.options.maxFov;
    this.fov = clamp(startingFov, this.options.minFov, this.options.maxFov);
    this.velocityYaw = 0;
    this.velocityPitch = 0;

    this.isDragging = false;
    this.dragDistance = 0;
    this.lastPointer = { x: 0, y: 0 };

    this.markers = [];
    this.markerElements = new Map();

    this.aspect = 1;
    this.viewMatrix = new Float32Array(16);
    this.projectionMatrix = new Float32Array(16);
    this.viewProjectionMatrix = new Float32Array(16);

    this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
    this.resizeObserver.observe(this.container);

    this.boundPointerDown = this.onPointerDown.bind(this);
    this.boundPointerUp = this.onPointerUp.bind(this);
    this.boundPointerMove = this.onPointerMove.bind(this);
    this.boundWheel = this.onWheel.bind(this);

    this.canvas.addEventListener('pointerdown', this.boundPointerDown);
    window.addEventListener('pointerup', this.boundPointerUp);
    window.addEventListener('pointermove', this.boundPointerMove);
    this.canvas.addEventListener('wheel', this.boundWheel, { passive: false });

    this.initGL();
    this.resizeCanvas();
    this.renderLoop();
  }

  initGL() {
    const vertexShaderSource = `
      attribute vec3 aPosition;
      attribute vec2 aTexCoord;
      uniform mat4 uProjection;
      uniform mat4 uView;
      varying vec2 vTexCoord;
      void main() {
        vTexCoord = vec2(1.0 - aTexCoord.x, aTexCoord.y);
        gl_Position = uProjection * uView * vec4(aPosition, 1.0);
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      varying vec2 vTexCoord;
      uniform sampler2D uTexture;
      void main() {
        gl_FragColor = texture2D(uTexture, vTexCoord);
      }
    `;

    this.program = createProgram(this.gl, vertexShaderSource, fragmentShaderSource);
    this.attribLocations = {
      position: this.gl.getAttribLocation(this.program, 'aPosition'),
      texCoord: this.gl.getAttribLocation(this.program, 'aTexCoord')
    };
    this.uniformLocations = {
      projection: this.gl.getUniformLocation(this.program, 'uProjection'),
      view: this.gl.getUniformLocation(this.program, 'uView'),
      texture: this.gl.getUniformLocation(this.program, 'uTexture')
    };

    this.createSphereGeometry();

    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.depthFunc(this.gl.LEQUAL);
    this.gl.disable(this.gl.CULL_FACE);
  }

  createSphereGeometry(segments = 32, rings = 64) {
    const positions = [];
    const texCoords = [];
    const indices = [];

    for (let y = 0; y <= segments; y++) {
      const v = y / segments;
      const theta = v * Math.PI;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      for (let x = 0; x <= rings; x++) {
        const u = x / rings;
        const phi = u * Math.PI * 2;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        const px = sinTheta * cosPhi;
        const py = cosTheta;
        const pz = sinTheta * sinPhi;

        positions.push(px, py, pz);
        texCoords.push(u, v);
      }
    }

    for (let y = 0; y < segments; y++) {
      for (let x = 0; x < rings; x++) {
        const first = y * (rings + 1) + x;
        const second = first + rings + 1;

        indices.push(first, second, first + 1);
        indices.push(second, second + 1, first + 1);
      }
    }

    const gl = this.gl;
    this.buffers.position = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    this.buffers.texCoord = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.texCoord);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

    this.buffers.index = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.index);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    this.indexCount = indices.length;
  }

  resizeCanvas() {
    const rect = this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.floor(rect.width * dpr));
    const height = Math.max(1, Math.floor(rect.height * dpr));

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;

    this.displayWidth = rect.width || 1;
    this.displayHeight = rect.height || 1;
    this.aspect = this.displayWidth / this.displayHeight;
    this.projectionMatrix = createProjectionMatrix(this.fov, this.aspect);
  }

  async setPanorama(source) {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Não foi possível carregar a imagem panorâmica.'));
      img.crossOrigin = 'anonymous';
      img.src = source;
    });

    const gl = this.gl;
    if (!this.texture) {
      this.texture = gl.createTexture();
    }

    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    if (isPowerOfTwo(image.width) && isPowerOfTwo(image.height)) {
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.image = image;
    this.fov = this.options.maxFov;
    this.projectionMatrix = createProjectionMatrix(this.fov, this.aspect);
  }

  setMarkers(markers = []) {
    this.markers = markers.map(marker => ({
      id: marker.id || `marker-${Math.random().toString(36).slice(2, 10)}`,
      yaw: marker.yaw || 0,
      pitch: marker.pitch || 0,
      label: marker.label || '',
      tooltip: marker.tooltip || '',
      data: marker.data || null,
      onClick: marker.onClick
    }));

    const existingIds = new Set(this.markers.map(marker => marker.id));
    for (const [id, element] of this.markerElements.entries()) {
      if (!existingIds.has(id)) {
        element.remove();
        this.markerElements.delete(id);
      }
    }

    this.markers.forEach(marker => {
      if (this.markerElements.has(marker.id)) {
        const element = this.markerElements.get(marker.id);
        element.dataset.tooltip = marker.tooltip || '';
        element.textContent = marker.label;
        element.dataset.id = marker.id;
        element.tabIndex = this.options.markerInteraction ? 0 : -1;
        element.style.pointerEvents = this.options.markerInteraction ? 'auto' : 'none';
        return;
      }
      const element = document.createElement('button');
      element.type = 'button';
      element.className = 'viewer-360-marker';
      element.textContent = marker.label;
      element.dataset.id = marker.id;
      element.dataset.tooltip = marker.tooltip || '';
      element.style.pointerEvents = this.options.markerInteraction ? 'auto' : 'none';
      element.tabIndex = this.options.markerInteraction ? 0 : -1;
      if (this.options.markerInteraction) {
        element.addEventListener('click', event => {
          event.stopPropagation();
          if (typeof marker.onClick === 'function') {
            marker.onClick(marker);
          } else if (typeof this.options.onMarkerClick === 'function') {
            this.options.onMarkerClick(marker);
          }
        });
        element.addEventListener('mouseenter', () => this.showTooltip(marker, element));
        element.addEventListener('mouseleave', () => this.hideTooltip());
      }
      this.markerLayer.appendChild(element);
      this.markerElements.set(marker.id, element);
    });
  }

  showTooltip(marker, element) {
    if (!marker.tooltip) return;
    this.tooltip.textContent = marker.tooltip;
    this.tooltip.style.display = 'block';
    this.tooltip.dataset.markerId = marker.id;
    const rect = element.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();
    this.tooltip.style.left = `${rect.left - containerRect.left}px`;
    this.tooltip.style.top = `${rect.top - containerRect.top - 12}px`;
  }

  hideTooltip() {
    this.tooltip.style.display = 'none';
    delete this.tooltip.dataset.markerId;
  }

  onPointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    this.isDragging = true;
    this.dragDistance = 0;
    this.lastPointer = { x: event.clientX, y: event.clientY };
    this.canvas.setPointerCapture(event.pointerId);
  }

  onPointerMove(event) {
    if (!this.isDragging) return;
    if (event.pointerId && document.pointerLockElement && document.pointerLockElement !== this.canvas) {
      return;
    }
    const dx = event.clientX - this.lastPointer.x;
    const dy = event.clientY - this.lastPointer.y;
    this.dragDistance += Math.abs(dx) + Math.abs(dy);
    this.lastPointer = { x: event.clientX, y: event.clientY };

    const speed = this.options.rotateSpeed;
    const yawDelta = dx * speed;
    const pitchDelta = dy * speed;
    this.yaw = wrapAngle(this.yaw - yawDelta);
    this.pitch = clamp(this.pitch + pitchDelta, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01);
    this.velocityYaw = -yawDelta;
    this.velocityPitch = pitchDelta;
  }

  onPointerUp(event) {
    if (!this.isDragging) return;
    this.isDragging = false;
    try {
      this.canvas.releasePointerCapture(event.pointerId);
    } catch (error) {
      // ignore release errors
    }

    if (this.dragDistance <= this.options.clickThreshold && typeof this.options.onClick === 'function') {
      const { yaw, pitch } = this.anglesFromScreen(event.clientX, event.clientY);
      this.options.onClick({ yaw, pitch });
    }
  }

  onWheel(event) {
    event.preventDefault();
    const delta = Math.sign(event.deltaY || 1);
    this.fov = clamp(this.fov + delta * 2, this.options.minFov, this.options.maxFov);
    this.projectionMatrix = createProjectionMatrix(this.fov, this.aspect);
  }

  anglesFromScreen(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const ndcX = (2 * x) / rect.width - 1;
    const ndcY = 1 - (2 * y) / rect.height;

    const aspect = rect.width / rect.height;
    const fovRad = (this.fov * Math.PI) / 180;
    const tanHalfFov = Math.tan(fovRad / 2);

    const dir = normalizeVector([
      ndcX * tanHalfFov * aspect,
      ndcY * tanHalfFov,
      -1
    ]);

    const worldDir = applyCameraRotation(dir, this.yaw, this.pitch);
    const yaw = Math.atan2(worldDir[0], -worldDir[2]);
    const pitch = Math.asin(clamp(worldDir[1], -1, 1));
    return { yaw, pitch };
  }

  applyInertia() {
    if (Math.abs(this.velocityYaw) > 0.00005 || Math.abs(this.velocityPitch) > 0.00005) {
      this.yaw = wrapAngle(this.yaw + this.velocityYaw);
      this.pitch = clamp(this.pitch + this.velocityPitch, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01);
      this.velocityYaw *= this.options.inertia;
      this.velocityPitch *= this.options.inertia;
    } else {
      this.velocityYaw = 0;
      this.velocityPitch = 0;
    }
  }

  updateMatrices() {
    const cosYaw = Math.cos(this.yaw);
    const sinYaw = Math.sin(this.yaw);
    const cosPitch = Math.cos(this.pitch);
    const sinPitch = Math.sin(this.pitch);

    this.viewMatrix = new Float32Array([
      cosYaw,
      0,
      -sinYaw,
      0,
      sinYaw * sinPitch,
      cosPitch,
      cosYaw * sinPitch,
      0,
      sinYaw * cosPitch,
      -sinPitch,
      cosYaw * cosPitch,
      0,
      0,
      0,
      0,
      1
    ]);

    this.viewProjectionMatrix = multiplyMatrices(this.projectionMatrix, this.viewMatrix);
  }

  updateMarkers() {
    if (!this.markers.length) {
      this.hideTooltip();
      return;
    }
    const containerRect = this.container.getBoundingClientRect();
    const width = containerRect.width || 1;
    const height = containerRect.height || 1;

    this.markers.forEach(marker => {
      const element = this.markerElements.get(marker.id);
      if (!element) return;
      const direction = directionFromAngles(marker.yaw, marker.pitch);
      const [cx, cy, cz, cw] = transformDirection(this.viewProjectionMatrix, direction);
      if (cw <= 0) {
        element.style.opacity = '0';
        element.style.pointerEvents = 'none';
        if (this.tooltip.dataset.markerId === marker.id) {
          this.hideTooltip();
        }
        return;
      }
      const ndcX = cx / cw;
      const ndcY = cy / cw;
      if (ndcX < -1 || ndcX > 1 || ndcY < -1 || ndcY > 1) {
        element.style.opacity = '0';
        element.style.pointerEvents = 'none';
        if (this.tooltip.dataset.markerId === marker.id) {
          this.hideTooltip();
        }
        return;
      }
      const px = (ndcX * 0.5 + 0.5) * width;
      const py = (-ndcY * 0.5 + 0.5) * height;
      element.style.opacity = '1';
      element.style.left = `${px}px`;
      element.style.top = `${py}px`;
      element.style.pointerEvents = this.options.markerInteraction ? 'auto' : 'none';
    });
  }

  renderScene() {
    if (!this.texture) return;
    const gl = this.gl;

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    this.updateMatrices();

    gl.useProgram(this.program);
    gl.uniformMatrix4fv(this.uniformLocations.projection, false, this.projectionMatrix);
    gl.uniformMatrix4fv(this.uniformLocations.view, false, this.viewMatrix);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(this.uniformLocations.texture, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
    gl.enableVertexAttribArray(this.attribLocations.position);
    gl.vertexAttribPointer(this.attribLocations.position, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.texCoord);
    gl.enableVertexAttribArray(this.attribLocations.texCoord);
    gl.vertexAttribPointer(this.attribLocations.texCoord, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.index);
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);

    this.updateMarkers();
  }

  renderLoop() {
    this.animationFrame = requestAnimationFrame(() => this.renderLoop());
    this.applyInertia();
    this.renderScene();
  }

  destroy() {
    cancelAnimationFrame(this.animationFrame);
    this.resizeObserver.disconnect();
    this.canvas.removeEventListener('pointerdown', this.boundPointerDown);
    this.canvas.removeEventListener('wheel', this.boundWheel);
    window.removeEventListener('pointerup', this.boundPointerUp);
    window.removeEventListener('pointermove', this.boundPointerMove);
    this.markerElements.forEach(element => element.remove());
    this.markerElements.clear();
    if (this.gl) {
      if (this.texture) this.gl.deleteTexture(this.texture);
      if (this.program) this.gl.deleteProgram(this.program);
    }
    this.container.innerHTML = '';
  }
}
