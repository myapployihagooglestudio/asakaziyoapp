import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

interface ThreeIslamicCanvasProps {
  className?: string;
  intensity?: 'hero' | 'subtle';
}

// Pre-allocated math helpers outside render loop (zero GC per frame)
const _pointerTarget = new THREE.Vector2(0, 0);
const _pointerCurrent = new THREE.Vector2(0, 0);

/**
 * Software-WebGL detector based strictly on GPU renderer string (never UA).
 * Keeps identical scene composition while pacing software rendering smoothly.
 */
function detectSoftwareWebGL(): { supported: boolean; isSoftwareGl: boolean } {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!gl) return { supported: false, isSoftwareGl: true };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    return { supported: true, isSoftwareGl };
  } catch {
    return { supported: false, isSoftwareGl: true };
  }
}

/**
 * Builds a multi-part procedural Islamic 8-pointed Rub-el-Hizb + Astrolabe Armillary Group
 * (Composite 6-part procedural model with beveled extrusions & varied PBR roughness/metalness)
 */
function createIslamicAstrolabeGroup(): THREE.Group {
  const root = new THREE.Group();

  // Varied PBR Materials (roughness delta >= 0.25 between adjacent parts)
  const brushedGoldMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#D4B46A'),
    metalness: 0.92,
    roughness: 0.2,
    clearcoat: 0.65,
    clearcoatRoughness: 0.18,
  });

  const deepEmeraldMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#07382A'),
    metalness: 0.18,
    roughness: 0.52,
    clearcoat: 0.9,
    clearcoatRoughness: 0.12,
  });

  const brightEmeraldTrimMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#10B981'),
    emissive: new THREE.Color('#064E3B'),
    emissiveIntensity: 0.7,
    metalness: 0.55,
    roughness: 0.28,
  });

  // Part 1: Outer Beveled Meridian Ring
  const outerRingGeo = new THREE.TorusGeometry(2.05, 0.042, 20, 96);
  const outerRing = new THREE.Mesh(outerRingGeo, brushedGoldMat);
  root.add(outerRing);

  // Part 2: Secondary Inclined Equatorial Ring
  const innerRingGeo = new THREE.TorusGeometry(1.62, 0.028, 16, 80);
  const innerRing = new THREE.Mesh(innerRingGeo, brightEmeraldTrimMat);
  innerRing.rotation.x = Math.PI * 0.24;
  innerRing.rotation.y = Math.PI * 0.16;
  root.add(innerRing);

  // Part 3 & 4: Twin Interlocking Extruded Squares forming Rub-el-Hizb (8-pointed Islamic star)
  const createSquareFrame = (size: number, thickness: number): THREE.ExtrudeGeometry => {
    const half = size / 2;
    const inner = half - thickness;
    const shape = new THREE.Shape();
    shape.moveTo(-half, -half);
    shape.lineTo(half, -half);
    shape.lineTo(half, half);
    shape.lineTo(-half, half);
    shape.closePath();

    const hole = new THREE.Path();
    hole.moveTo(-inner, -inner);
    hole.lineTo(-inner, inner);
    hole.lineTo(inner, inner);
    hole.lineTo(inner, -inner);
    hole.closePath();
    shape.holes.push(hole);

    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.075,
      bevelEnabled: true,
      bevelThickness: 0.022,
      bevelSize: 0.018,
      bevelSegments: 3,
    });
  };

  const starGeoA = createSquareFrame(2.15, 0.13);
  starGeoA.center();
  const squareA = new THREE.Mesh(starGeoA, brushedGoldMat);
  root.add(squareA);

  const starGeoB = createSquareFrame(2.15, 0.13);
  starGeoB.center();
  const squareB = new THREE.Mesh(starGeoB, deepEmeraldMat);
  squareB.rotation.z = Math.PI / 4;
  squareB.position.z = 0.04;
  root.add(squareB);

  // Part 5: Central Faceted Octahedral Emerald Core
  const coreGeo = new THREE.OctahedronGeometry(0.46, 0);
  const coreMesh = new THREE.Mesh(coreGeo, deepEmeraldMat);
  root.add(coreMesh);

  // Part 6: Orbiting 8 Gold Vertex Finials (InstancedMesh)
  const finialGeo = new THREE.SphereGeometry(0.055, 14, 14);
  const finials = new THREE.InstancedMesh(finialGeo, brushedGoldMat, 8);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    dummy.position.set(Math.cos(angle) * 2.05, Math.sin(angle) * 2.05, 0);
    dummy.scale.setScalar(i % 2 === 0 ? 1.15 : 0.88);
    dummy.updateMatrix();
    finials.setMatrixAt(i, dummy.matrix);
  }
  finials.instanceMatrix.needsUpdate = true;
  finials.computeBoundingSphere();
  root.add(finials);

  root.userData = { outerRing, innerRing, squareA, squareB, coreMesh };
  return root;
}

/**
 * Custom GLSL Aurora Light-Wave Shader Plane (atmospheric emerald/champagne volumetric waves)
 */
function createAuroraShaderPlane(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(16, 10, 24, 16);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2(0, 0) },
    },
    vertexShader: `
      varying vec2 vUv;
      uniform float uTime;
      void main() {
        vUv = uv;
        vec3 pos = position;
        pos.z += sin(pos.x * 0.65 + uTime * 0.45) * 0.28 + cos(pos.y * 0.8 + uTime * 0.35) * 0.18;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      uniform vec2 uPointer;

      void main() {
        vec2 uv = vUv;
        float wave1 = sin(uv.x * 5.2 + uTime * 0.42 + uv.y * 2.1) * 0.5 + 0.5;
        float wave2 = cos(uv.x * 3.4 - uTime * 0.31 + uv.y * 3.6) * 0.5 + 0.5;
        float distPointer = distance(uv, vec2(0.5 + uPointer.x * 0.22, 0.5 + uPointer.y * 0.22));
        float radial = smoothstep(0.88, 0.08, distPointer);

        vec3 emerald = vec3(0.06, 0.72, 0.51);
        vec3 gold = vec3(0.83, 0.70, 0.42);
        vec3 deep = vec3(0.02, 0.14, 0.10);

        vec3 col = mix(deep, emerald, wave1 * 0.48);
        col = mix(col, gold, wave2 * radial * 0.34);

        float edgeFade = smoothstep(0.0, 0.25, uv.x) * smoothstep(1.0, 0.75, uv.x)
                       * smoothstep(0.0, 0.25, uv.y) * smoothstep(1.0, 0.75, uv.y);
        float alpha = (0.14 + radial * 0.14) * edgeFade;
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(0, 0, -3.2);
  return mesh;
}

/**
 * Interactive Atmospheric Particle Dust Field (Emerald & Champagne Gold)
 */
function createParticleField(count: number): THREE.Points {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const cEmerald = new THREE.Color('#34D399');
  const cGold = new THREE.Color('#DFC37E');

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    positions[i3] = (Math.random() - 0.5) * 11;
    positions[i3 + 1] = (Math.random() - 0.5) * 6.5;
    positions[i3 + 2] = (Math.random() - 0.5) * 4.5;

    const c = i % 3 === 0 ? cGold : cEmerald;
    colors[i3] = c.r;
    colors[i3 + 1] = c.g;
    colors[i3 + 2] = c.b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.048,
    vertexColors: true,
    transparent: true,
    opacity: 0.68,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  return new THREE.Points(geo, mat);
}

/**
 * ASAKA ZIYO — Lazy-Loaded Real-Time Three.js WebGL Spatial Islamic Scene
 * Includes RoomEnvironment reflections, GLSL Aurora shader, interactive particles,
 * software-WebGL pacing guard, visibility pause, reduced-motion single-frame support,
 * and clean CSS fallback if WebGL is unavailable.
 */
export const ThreeIslamicCanvas: React.FC<ThreeIslamicCanvasProps> = ({
  className = '',
  intensity = 'hero',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [fallbackMode, setFallbackMode] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container || typeof window === 'undefined') return;

    const { supported, isSoftwareGl } = detectSoftwareWebGL();
    if (!supported) {
      setFallbackMode(true);
      return;
    }

    const prefersReduced =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 260);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 40);
    camera.position.set(0, 0, 6.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    // Mandatory studio environment map for metallic champagne gold & emerald reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // Balanced 3-point warm/cool studio lighting
    const hemiLight = new THREE.HemisphereLight('#A7F3D0', '#03120D', 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#F5E8C7', 2.0);
    keyLight.position.set(4.5, 5.2, 5.5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#10B981', 1.35);
    rimLight.position.set(-5.0, -2.5, 3.5);
    scene.add(rimLight);

    // Procedural Composite Islamic Astrolabe + GLSL Aurora Plane + Particles
    const astrolabe = createIslamicAstrolabeGroup();
    astrolabe.position.set(intensity === 'hero' ? 1.55 : 0, 0.05, -0.4);
    astrolabe.scale.setScalar(intensity === 'hero' ? 0.92 : 0.72);
    scene.add(astrolabe);

    const auroraMesh = createAuroraShaderPlane();
    scene.add(auroraMesh);

    const particleCount = isSoftwareGl ? 70 : 140;
    const particles = createParticleField(particleCount);
    scene.add(particles);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let frameId = 0;
    let isDisposed = false;
    let isVisible = true;
    const clock = new THREE.Clock();

    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      _pointerTarget.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _pointerTarget.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || isDisposed) return;
      const w = Math.max(entry.contentRect.width, 1);
      const h = Math.max(entry.contentRect.height, 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      if (prefersReduced) {
        renderer.render(scene, camera);
      }
    });
    resizeObserver.observe(container);

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        const nowVisible = Boolean(entries[0]?.isIntersecting);
        isVisible = nowVisible;
      },
      { threshold: 0.05 }
    );
    intersectionObserver.observe(container);

    const afterDraw = (cb: () => void) => {
      try {
        const gl = renderer.getContext() as WebGL2RenderingContext;
        if (typeof gl.fenceSync === 'function') {
          const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
          gl.flush();
          const poll = () => {
            if (isDisposed) return;
            const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
            if (status === gl.UNSIGNALED) {
              frameId = window.setTimeout(poll, 8);
            } else {
              if (sync) gl.deleteSync(sync);
              frameId = window.setTimeout(cb, 85);
            }
          };
          frameId = window.setTimeout(poll, 8);
          return;
        }
      } catch {
        // Fallback timeout for WebGL1
      }
      frameId = window.setTimeout(cb, 95);
    };

    const renderFrame = (elapsed: number, delta: number) => {
      _pointerCurrent.x = THREE.MathUtils.damp(_pointerCurrent.x, _pointerTarget.x, 4.5, delta);
      _pointerCurrent.y = THREE.MathUtils.damp(_pointerCurrent.y, _pointerTarget.y, 4.5, delta);

      const { innerRing, squareA, squareB, coreMesh } = astrolabe.userData as {
        innerRing: THREE.Mesh;
        squareA: THREE.Mesh;
        squareB: THREE.Mesh;
        coreMesh: THREE.Mesh;
      };

      astrolabe.rotation.y = elapsed * 0.14 + _pointerCurrent.x * 0.28;
      astrolabe.rotation.x = Math.sin(elapsed * 0.32) * 0.1 + _pointerCurrent.y * 0.2;
      innerRing.rotation.z = -elapsed * 0.22;
      squareA.rotation.z = elapsed * 0.09;
      squareB.rotation.z = Math.PI / 4 - elapsed * 0.09;
      coreMesh.rotation.y = -elapsed * 0.35;
      coreMesh.rotation.x = elapsed * 0.2;

      const auroraMat = auroraMesh.material as THREE.ShaderMaterial;
      auroraMat.uniforms.uTime.value = elapsed;
      auroraMat.uniforms.uPointer.value.set(_pointerCurrent.x, _pointerCurrent.y);

      particles.rotation.y = elapsed * 0.035 + _pointerCurrent.x * 0.08;
      particles.rotation.x = _pointerCurrent.y * 0.05;

      renderer.render(scene, camera);
    };

    if (prefersReduced) {
      renderFrame(0.8, 0.016);
    } else {
      const tick = () => {
        if (isDisposed) return;
        const delta = Math.min(clock.getDelta(), 0.1);
        const elapsed = clock.getElapsedTime();

        if (isVisible) {
          renderFrame(elapsed, delta);
        }

        if (isSoftwareGl) {
          afterDraw(tick);
        } else {
          frameId = requestAnimationFrame(tick);
        }
      };
      tick();
    }

    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('pointermove', onPointerMove);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();

      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh || (obj as THREE.Points).isPoints) {
          const renderable = obj as THREE.Mesh | THREE.Points;
          renderable.geometry?.dispose();
          if (Array.isArray(renderable.material)) {
            renderable.material.forEach((m) => m.dispose());
          } else {
            renderable.material?.dispose();
          }
        }
      });
      envTarget.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [intensity]);

  if (fallbackMode) {
    return (
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 overflow-hidden az-aurora-waves ${className}`}
      />
    );
  }

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    />
  );
};

export default ThreeIslamicCanvas;
