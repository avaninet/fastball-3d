'use strict';

// Both lenses sample the same baked 360° night horizon. Longitude wraps
// once around the local vertical. The camera rays supply the limb curvature.
const EarthSky = (() => {
  const limbAngle=66, horizonV=.494, rowsPerDegree=.021, azimuthOrigin=.28;
  const sky = [5, 12, 18], night = [3, 9, 14];
  const packedColor = rgb => new Uint32Array(new Uint8Array([...rgb, 255]).buffer)[0];
  const skyPixel = packedColor(sky), nightPixel = packedColor(night);
  const stage = document.createElement('canvas');
  let photo, atlas, gpu;
  let views = new WeakMap();
  let scale = 1, previousFrame, projected = false, slowFrames = 0, fastFrames = 0;

  function load(image) {
    photo = image;
    atlas = null;
    views = new WeakMap();
  }

  // Count the actual display interval following a projection. Idle camera
  // frames, input event frequency and simulated flight time provide no signal.
  function frame(now) {
    const elapsed = now - previousFrame;
    previousFrame = now;
    if (projected && elapsed > 0 && elapsed < 1000) {
      slowFrames = elapsed > 42 ? slowFrames + 1 : 0;
      fastFrames = elapsed < 25 ? fastFrames + 1 : 0;
      if (slowFrames >= 10 || fastFrames >= 90) {
        scale = Flight.clamp(scale + (slowFrames >= 10 ? -0.125 : 0.125), 0.625, 1);
        slowFrames = fastFrames = 0;
      }
    }
    projected = false;
  }

  // Use one GL context for both lenses and the extended portrait backdrop.
  // Each lens retains a 2D copy, so steady views never rerun the projection.
  function createGPU() {
    const gl = stage.getContext('webgl', {alpha:false, antialias:false, depth:false, stencil:false});
    if (!gl || gl.isContextLost()) return null;
    const program = gl.createProgram();
    const vertex = `
      attribute vec2 position;
      varying vec2 screen;
      void main() {
        screen = position;
        gl_Position = vec4(position, 0., 1.);
      }`;
    const fragment = `
      precision highp float;
      varying vec2 screen;
      uniform sampler2D photograph;
      uniform vec3 forward, right, up;
      uniform vec3 lens; // half-width/f, half-height/f, vertical offset/f
      void main() {
        vec3 ray = normalize(forward + right * (screen.x * lens.x)
                              + up * (screen.y * lens.y + lens.z));
        vec3 space = vec3(5., 12., 18.) / 255.;
        vec3 dark = vec3(3., 9., 14.) / 255.;
        gl_FragColor = vec4(space, 1.);
        if (-ray.x <= .07) return;
        float polar = degrees(acos(clamp(-ray.x, -1., 1.)));
        if (polar < 30.) { gl_FragColor = vec4(dark, 1.); return; }
        float u = ${azimuthOrigin} + atan(ray.z, ray.y) / radians(360.);
        float v = ${horizonV} + (${limbAngle.toFixed(1)} - polar) * ${rowsPerDegree};
        gl_FragColor = texture2D(photograph, vec2(u, v));
      }`;
    for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]]) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      gl.attachShader(program, shader);
      gl.deleteShader(shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return null;
    }
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    for (const filter of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) {
      gl.texParameteri(gl.TEXTURE_2D, filter, gl.LINEAR);
    }
    const maximum = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const viewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
    const uniform = name => gl.getUniformLocation(program, name);
    const forward = uniform('forward'), right = uniform('right'), up = uniform('up'), lens = uniform('lens');
    let uploaded;
    return (view, w, h, centerY, camera) => {
      const {width, height} = view.canvas;
      if (uploaded !== photo) {
        if (Math.max(photo.naturalWidth, photo.naturalHeight) > maximum) return false;
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, photo);
        if (gl.getError() !== gl.NO_ERROR) return false;
        uploaded = photo;
      }
      if (width > viewport[0] || height > viewport[1]) return false;
      if (stage.width < width) stage.width = width;
      if (stage.height < height) stage.height = height;
      if (gl.drawingBufferWidth < width || gl.drawingBufferHeight < height || gl.isContextLost()) return false;
      gl.viewport(0, stage.height - height, width, height);
      gl.uniform3fv(forward, camera.forward);
      gl.uniform3fv(right, camera.right);
      gl.uniform3fv(up, camera.up);
      gl.uniform3f(lens, w/(2*camera.f), h/(2*camera.f), (centerY-h/2)/camera.f);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      view.drawImage(stage, 0, 0, width, height, 0, 0, width, height);
      return true;
    };
  }

  stage.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    gpu = null;
    views = new WeakMap();
  });
  stage.addEventListener('webglcontextrestored', () => {
    gpu = undefined;
    views = new WeakMap();
  });

  // Pad each row with its first column to filter across the longitude seam.
  // WebGL repeats the horizontal axis and clamps the vertical edges.
  function prepareAtlas() {
    const source = document.createElement('canvas');
    const width = photo.naturalWidth, height = photo.naturalHeight;
    source.width = width + 1;
    source.height = height + 1;
    const ctx = source.getContext('2d', {willReadFrequently:true});
    ctx.drawImage(photo, 0, 0);
    const pixels = ctx.getImageData(0, 0, source.width, source.height).data;
    const stride = source.width * 4;
    for (let y = 0; y < height; y++) {
      const start = y*stride, end = start+width*4;
      pixels.copyWithin(end, start, start+4);
    }
    pixels.copyWithin(height*stride, (height-1)*stride, height*stride);
    return {pixels, width, height, stride};
  }

  function drawSoftware(view, w, h, centerY, camera) {
    if (!atlas) atlas = prepareAtlas();
    const {width, height} = view.ctx.canvas;
    if (view.pixels?.width !== width || view.pixels.height !== height) {
      view.pixels = view.ctx.createImageData(width, height);
    }
    const out = view.pixels.data, packed = new Uint32Array(out.buffer);
    const {pixels, stride} = atlas, {f, forward, right, up} = camera;
    const pixelStep = w / (width * f);
    // Interpolate texture coordinates over at most one degree of a scanline.
    // Reproject individual rays at the longitude seam and solid-color edges.
    const span = Math.max(1, Math.min(16, Math.floor(Flight.rad / pixelStep)));
    let y, rx, ry, rz;
    function locate(i, point) {
      const x = (i+0.5-width/2)*pixelStep;
      const cosine = -(rx + x*right[0]) / Math.sqrt(1 + x*x + y*y);
      if (cosine <= 0.07) { point.fill = skyPixel; return; }
      if (cosine >= Math.cos(30*Flight.rad)) { point.fill = nightPixel; return; }
      const z = rz + x*right[2];
      const u = azimuthOrigin + Math.atan2(z, ry+x*right[1])/(2*Math.PI);
      const v = horizonV + (limbAngle-Math.acos(cosine)/Flight.rad)*rowsPerDegree;
      point.fill = v<=0 ? skyPixel : v>=1 ? nightPixel : null;
      const column=u*atlas.width-.5;
      point.u=column-Math.floor(column/atlas.width)*atlas.width;
      point.v=Flight.clamp(v*atlas.height-.5, 0, atlas.height-1);
    }
    function sample(index, u, v) {
      const ix = Math.floor(u), iy = Math.floor(v), fx = u-ix, fy = v-iy;
      const a = iy*stride+ix*4, b = a+stride;
      for (let k = 0; k < 3; k++) {
        const top = pixels[a+k]+fx*(pixels[a+4+k]-pixels[a+k]);
        const bottom = pixels[b+k]+fx*(pixels[b+4+k]-pixels[b+k]);
        out[index*4+k] = top+fy*(bottom-top);
      }
    }
    // The photograph is opaque, including spans copied on subsequent frames.
    packed.fill(skyPixel);
    let left = {}, rightEdge = {};
    const point = {};
    for (let j = 0; j < height; j++) {
      y = (centerY - (j+0.5)*h/height)/f;
      rx = forward[0]+y*up[0]; ry = forward[1]+y*up[1]; rz = forward[2]+y*up[2];
      locate(0, left);
      for (let i = 0; i < width; i += span) {
        const count = Math.min(span, width-i), index = j*width+i;
        locate(i+count, rightEdge);
        if (left.fill !== null && left.fill === rightEdge.fill) {
          if (left.fill !== skyPixel) packed.fill(left.fill, index, index+count);
        } else if (left.fill === null && rightEdge.fill === null && Math.abs(rightEdge.u-left.u)<atlas.width/2) {
          const du = (rightEdge.u-left.u)/count, dv = (rightEdge.v-left.v)/count;
          for (let k = 0; k < count; k++) sample(index+k, left.u+k*du, left.v+k*dv);
        } else {
          for (let k = 0; k < count; k++) {
            locate(i+k, point);
            if (point.fill !== null) packed[index+k] = point.fill;
            else sample(index+k, point.u, point.v);
          }
        }
        const previous = left; left = rightEdge; rightEdge = previous;
      }
    }
    view.ctx.putImageData(view.pixels, 0, 0);
  }

  function resize(view, w, h, budget, density = 1) {
    const ratio = Math.min(density, Math.sqrt(budget / (w*h))) * scale;
    const canvas = view.ctx.canvas;
    const width = Math.max(1, Math.round(w*ratio)), height = Math.max(1, Math.round(h*ratio));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
  }

  function draw(ctx, w, h, centerY, camera) {
    if (!photo) {
      ctx.fillStyle = '#050c12';
      ctx.fillRect(0, 0, w, h);
      return;
    }
    let view = views.get(ctx.canvas);
    if (!view) {
      view = {ctx:document.createElement('canvas').getContext('2d', {alpha:false})};
      views.set(ctx.canvas, view);
    }
    const density = ctx.canvas.width / w;
    const key = [w, h, density, centerY, camera.f, camera.az, camera.el].join('/');
    if (view.key !== key) {
      if (gpu === undefined) gpu = createGPU();
      if (gpu) {
        resize(view, w, h, 2560*1440, density);
        if (!gpu(view.ctx, w, h, centerY, camera)) gpu = null;
      }
      if (!gpu) {
        resize(view, w, h, 480000);
        drawSoftware(view, w, h, centerY, camera);
      }
      view.key = key;
      projected = true;
    }
    ctx.drawImage(view.ctx.canvas, 0, 0, w, h);
  }

  return {load, draw, frame, limbX:-Math.cos(limbAngle*Flight.rad)};
})();
