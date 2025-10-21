import React, { useCallback, useMemo, useRef } from 'react';
import { ExpoWebGLRenderingContext, GLView } from 'expo-gl';
import {
  GestureResponderEvent,
  Image,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const vertexShaderSource = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShaderSource = `
precision highp float;
uniform float iTime;
uniform vec3 iResolution;
uniform float hue;
uniform float hover;
uniform float rot;
uniform float hoverIntensity;
varying vec2 vUv;

vec3 rgb2yiq(vec3 c) {
  float y = dot(c, vec3(0.299, 0.587, 0.114));
  float i = dot(c, vec3(0.596, -0.274, -0.322));
  float q = dot(c, vec3(0.211, -0.523, 0.312));
  return vec3(y, i, q);
}

vec3 yiq2rgb(vec3 c) {
  float r = c.x + 0.956 * c.y + 0.621 * c.z;
  float g = c.x - 0.272 * c.y - 0.647 * c.z;
  float b = c.x - 1.106 * c.y + 1.703 * c.z;
  return vec3(r, g, b);
}

vec3 adjustHue(vec3 color, float hueDeg) {
  float hueRad = hueDeg * 3.14159265 / 180.0;
  vec3 yiq = rgb2yiq(color);
  float cosA = cos(hueRad);
  float sinA = sin(hueRad);
  float i = yiq.y * cosA - yiq.z * sinA;
  float q = yiq.y * sinA + yiq.z * cosA;
  yiq.y = i;
  yiq.z = q;
  return yiq2rgb(yiq);
}

vec3 hash33(vec3 p3) {
  p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
  p3 += dot(p3, p3.yxz + 19.19);
  return -1.0 + 2.0 * fract(vec3(
    p3.x + p3.y,
    p3.x + p3.z,
    p3.y + p3.z
  ) * p3.zyx);
}

float snoise3(vec3 p) {
  const float K1 = 0.333333333;
  const float K2 = 0.166666667;
  vec3 i = floor(p + (p.x + p.y + p.z) * K1);
  vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);
  vec3 e = step(vec3(0.0), d0 - d0.yzx);
  vec3 i1 = e * (1.0 - e.zxy);
  vec3 i2 = 1.0 - e.zxy * (1.0 - e);
  vec3 d1 = d0 - (i1 - K2);
  vec3 d2 = d0 - (i2 - K1);
  vec3 d3 = d0 - 0.5;
  vec4 h = max(0.6 - vec4(
    dot(d0, d0),
    dot(d1, d1),
    dot(d2, d2),
    dot(d3, d3)
  ), 0.0);
  vec4 n = h * h * h * h * vec4(
    dot(d0, hash33(i)),
    dot(d1, hash33(i + i1)),
    dot(d2, hash33(i + i2)),
    dot(d3, hash33(i + 1.0))
  );
  return dot(vec4(31.316), n);
}

vec4 extractAlpha(vec3 colorIn) {
  float a = max(max(colorIn.r, colorIn.g), colorIn.b);
  return vec4(colorIn.rgb / (a + 1e-5), a);
}

const vec3 baseColor1 = vec3(0.611765, 0.262745, 0.996078);
const vec3 baseColor2 = vec3(0.298039, 0.760784, 0.913725);
const vec3 baseColor3 = vec3(0.062745, 0.078431, 0.600000);
const float innerRadius = 0.58;
const float noiseScale = 0.65;

float light1(float intensity, float attenuation, float dist) {
  return intensity / (1.0 + dist * attenuation);
}

float light2(float intensity, float attenuation, float dist) {
  return intensity / (1.0 + dist * dist * attenuation);
}

float hexDistance(vec2 p) {
  p = abs(p);
  float metric = max(p.x * 0.8660254 + p.y * 0.5, p.y);
  return metric / 0.8660254;
}

float sdHexagon(vec2 p, float r) {
  const vec3 k = vec3(0.8660254, 0.5, 0.57735);
  p = abs(p);
  p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
  p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
  return length(p) * sign(p.y);
}

vec4 draw(vec2 uv) {
  vec3 color1 = adjustHue(baseColor1, hue);
  vec3 color2 = adjustHue(baseColor2, hue);
  vec3 color3 = adjustHue(baseColor3, hue);

  float ang = atan(uv.y, uv.x);
  float len = hexDistance(uv);
  float invLen = len > 0.001 ? 1.0 / len : 0.0;
  vec2 dir = len > 0.001 ? uv * invLen : vec2(0.0);

  float n0 = snoise3(vec3(uv * noiseScale, iTime * 0.5)) * 0.5 + 0.5;
  float r0 = mix(mix(innerRadius, 1.05, 0.4), mix(innerRadius, 1.05, 0.6), n0);
  float d0 = distance(uv, dir * r0);
  float v0 = light1(1.0, 10.0, d0);
  v0 *= smoothstep(r0 * 1.05, r0 * 0.95, len);
  float cl = cos(ang + iTime * 2.0) * 0.5 + 0.5;

  float a = iTime * -1.0;
  vec2 pos = vec2(cos(a), sin(a)) * r0;
  float d = distance(uv, pos);
  float v1 = light2(1.5, 5.0, d);
  v1 *= light1(1.0, 50.0, d0);

  float v2 = smoothstep(1.05, mix(innerRadius, 1.05, n0 * 0.5), len);
  float v3 = smoothstep(innerRadius, mix(innerRadius, 1.05, 0.5), len);

  vec3 col = mix(color1, color2, cl);
  col = mix(color3, col, v0);
  col = (col + v1) * v2 * v3;
  col = clamp(col, 0.0, 1.0);

  float rim = smoothstep(0.92, 0.98, len) - smoothstep(0.98, 1.05, len);
  float rimHighlight = max(rim, 0.0);
  col += vec3(0.55, 0.32, 0.82) * pow(rimHighlight, 1.6);

  float hexMask = 1.0 - smoothstep(1.0, 1.06, len);
  col *= hexMask;

  vec4 outCol = extractAlpha(col);
  outCol *= hexMask;
  return outCol;
}

vec4 mainImage(vec2 fragCoord) {
  vec2 center = iResolution.xy * 0.5;
  float size = min(iResolution.x, iResolution.y);
  vec2 uv = (fragCoord - center) / size * 2.0;

  float angle = rot;
  float s = sin(angle);
  float c = cos(angle);
  uv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);

  uv.x += hover * hoverIntensity * 0.1 * sin(uv.y * 10.0 + iTime);
  uv.y += hover * hoverIntensity * 0.1 * sin(uv.x * 10.0 + iTime);

  return draw(uv);
}

void main() {
  vec2 fragCoord = vUv * iResolution.xy;
  vec4 col = mainImage(fragCoord);
  gl_FragColor = vec4(col.rgb * col.a, col.a);
}
`;

type GLResources = {
  gl: ExpoWebGLRenderingContext;
  program: WebGLProgram;
  iTimeLoc: WebGLUniformLocation | null;
  iResolutionLoc: WebGLUniformLocation | null;
  hueLoc: WebGLUniformLocation | null;
  hoverLoc: WebGLUniformLocation | null;
  rotLoc: WebGLUniformLocation | null;
  hoverIntensityLoc: WebGLUniformLocation | null;
  hoverValue: number;
  targetHover: number;
  rotation: number;
  lastFrameTime: number;
  rafId?: number;
  size: { width: number; height: number };
};

const ROTATION_ACTIVE_SPEED = 0.2;
const ROTATION_IDLE_SPEED = 0.04;

const HexNative: React.FC = () => {
  const resourcesRef = useRef<GLResources | null>(null);

  const updateHover = useCallback((x: number, y: number) => {
    const resources = resourcesRef.current;
    if (!resources) return;
    const { width, height } = resources.size;
    if (!width || !height) return;

    const size = Math.min(width, height);
    const centerX = width / 2;
    const centerY = height / 2;
    const uvX = ((x - centerX) / size) * 2.0;
    const uvY = ((y - centerY) / size) * 2.0;

    const metric =
      Math.max(Math.abs(uvX) * 0.8660254 + Math.abs(uvY) * 0.5, Math.abs(uvY)) / 0.8660254;
    const inside = metric < 1.0;
    resources.targetHover = inside ? 1 : 0;
  }, []);

  const handleResponderMove = useCallback(
    (event: GestureResponderEvent) => {
      updateHover(event.nativeEvent.locationX, event.nativeEvent.locationY);
    },
    [updateHover],
  );

  const handleResponderGrant = handleResponderMove;

  const handleResponderRelease = useCallback(() => {
    const resources = resourcesRef.current;
    if (resources) {
      resources.targetHover = 0;
    }
  }, []);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    const resources = resourcesRef.current;
    if (!resources) return;

    resources.size = { width, height };
  }, []);

  const onContextCreate = useCallback(async (gl: ExpoWebGLRenderingContext) => {
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    if (!vertexShader) return;
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      console.warn('Vertex shader compile error', gl.getShaderInfoLog(vertexShader));
      return;
    }

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    if (!fragmentShader) return;
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      console.warn('Fragment shader compile error', gl.getShaderInfoLog(fragmentShader));
      return;
    }

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('Program link error', gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    const positions = new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      -1, 1,
      1, -1,
      1, 1,
    ]);
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const positionLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    const uvs = new Float32Array([
      0, 0,
      1, 0,
      0, 1,
      0, 1,
      1, 0,
      1, 1,
    ]);
    const uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);

    const uvLoc = gl.getAttribLocation(program, 'uv');
    gl.enableVertexAttribArray(uvLoc);
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

    const iTimeLoc = gl.getUniformLocation(program, 'iTime');
    const iResolutionLoc = gl.getUniformLocation(program, 'iResolution');
    const hueLoc = gl.getUniformLocation(program, 'hue');
    const hoverLoc = gl.getUniformLocation(program, 'hover');
    const rotLoc = gl.getUniformLocation(program, 'rot');
    const hoverIntensityLoc = gl.getUniformLocation(program, 'hoverIntensity');

    const resources: GLResources = {
      gl,
      program,
      iTimeLoc,
      iResolutionLoc,
      hueLoc,
      hoverLoc,
      rotLoc,
      hoverIntensityLoc,
      hoverValue: 0,
      targetHover: 0,
      rotation: 0,
      lastFrameTime: 0,
      size: { width: gl.drawingBufferWidth, height: gl.drawingBufferHeight },
    };
    resourcesRef.current = resources;

    gl.clearColor(0, 0, 0, 0);

    const render = (time: number) => {
      const ref = resourcesRef.current;
      if (!ref) return;
      const {
        gl: context,
        program: prog,
        iTimeLoc: timeLoc,
        iResolutionLoc: resolutionLoc,
        hueLoc: hueUniform,
        hoverLoc: hoverUniform,
        rotLoc: rotUniform,
        hoverIntensityLoc: hoverIntensityUniform,
      } = ref;

      const { width, height } = ref.size;
      const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
      const drawingWidth = width * dpr;
      const drawingHeight = height * dpr;
      if (resolutionLoc) {
        context.uniform3f(resolutionLoc, drawingWidth, drawingHeight, drawingWidth / drawingHeight);
      }

      context.viewport(0, 0, drawingWidth, drawingHeight);

      const delta = ref.lastFrameTime === 0 ? 0 : (time - ref.lastFrameTime) * 0.001;
      ref.lastFrameTime = time;

      ref.hoverValue += (ref.targetHover - ref.hoverValue) * 0.1;
      
      if (ref.targetHover > 0.0) {
        ref.rotation += delta * ROTATION_ACTIVE_SPEED;
      } else {
        ref.rotation += delta * ROTATION_IDLE_SPEED;
      }

      context.useProgram(prog);
      if (timeLoc) context.uniform1f(timeLoc, time * 0.001);
      if (hueUniform) context.uniform1f(hueUniform, 0);
      if (hoverUniform) context.uniform1f(hoverUniform, ref.hoverValue);
      if (rotUniform) context.uniform1f(rotUniform, ref.rotation);
      if (hoverIntensityUniform) context.uniform1f(hoverIntensityUniform, 1);

      context.drawArrays(context.TRIANGLES, 0, 6);
      context.flush();
      context.endFrameEXP();

      ref.rafId = requestAnimationFrame(render);
    };

    resources.rafId = requestAnimationFrame(render);
  }, []);

  React.useEffect(() => {
    return () => {
      const resources = resourcesRef.current;
      if (resources?.rafId) {
        cancelAnimationFrame(resources.rafId);
      }
      resourcesRef.current = null;
    };
  }, []);

  const responderProps = useMemo(
    () => ({
      onStartShouldSetResponder: () => true,
      onMoveShouldSetResponder: () => true,
      onResponderGrant: handleResponderGrant,
      onResponderMove: handleResponderMove,
      onResponderRelease: handleResponderRelease,
      onResponderTerminate: handleResponderRelease,
    }),
    [handleResponderGrant, handleResponderMove, handleResponderRelease],
  );

  return (
    <View style={styles.root}>
      <View style={styles.orbWrapper}>
        <Image
          style={styles.noiseImage}
          source={{
            uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJYAAACWCAAAAACRkNvGAAAACXBIWXMAAAsSAAALEgHS3X78AAABc0lEQVR4nO3TMQ2DMBAAQYT9/7cXKqsJh0kGugHcGz03sz8AAADw2jC3sKGhoWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFiH7AGWhgefYOYdw9z2z6gAAADwSye3L2hoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoWFh4e3BKqn9fdVxQ3AAAAAElFTkSuQmCC',
          }}
          resizeMode="cover"
        />
        <View style={StyleSheet.absoluteFill}>
          <View style={styles.glContainer} {...responderProps} onLayout={onLayout}>
            <GLView
              pointerEvents="none"
              style={StyleSheet.absoluteFill}
              onContextCreate={onContextCreate}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

export default HexNative;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#050014',
  },
  orbWrapper: {
    width: '88%',
    aspectRatio: 1,
    borderRadius: 36,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0b0620',
    borderWidth: 1,
    borderColor: 'rgba(187,121,255,0.12)',
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 45,
    shadowOffset: { width: 0, height: 32 },
    elevation: 24,
  },
  noiseImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
  },
  glContainer: {
    flex: 1,
  },
  hintContainer: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
  },
  hintBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(9,4,24,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  hintDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#B27BFF',
    marginRight: 10,
  },
  hintLine: {
    width: 70,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.35)',
    marginRight: 10,
  },
  hintText: {
    color: 'rgba(240,244,255,0.85)',
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
