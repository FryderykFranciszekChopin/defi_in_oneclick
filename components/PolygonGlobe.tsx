import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface PolygonGlobeProps {
  className?: string;
}

export const PolygonGlobe: React.FC<PolygonGlobeProps> = ({ className = '' }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    globe: THREE.Mesh;
    particles: THREE.Points | null;
  } | null>(null);
  const animationIdRef = useRef<number>(0);
  const isVisibleRef = useRef<boolean>(true);
  const performanceModeRef = useRef<'high' | 'medium' | 'low'>('high');

  useEffect(() => {
    if (!mountRef.current) return;

    // Check WebGL support
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }

    console.log('PolygonGlobe mounting...', {
      webglSupported: !!gl,
      devicePixelRatio: window.devicePixelRatio,
      screenSize: `${window.innerWidth}x${window.innerHeight}`
    });

    // Scene setup
    const scene = new THREE.Scene();
    // Deeper fog effect for Monet-like atmosphere
    scene.fog = new THREE.Fog(0x1a1a2e, 10, 25);

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Camera - adjusted for PC
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 18);

    // Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ 
        alpha: true, 
        antialias: true,
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: false // Attempt rendering even with performance issues
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      mountRef.current.appendChild(renderer.domElement);
    } catch (error) {
      console.error('Failed to create WebGL renderer:', error);
      return;
    }

    // Globe geometry - icosahedron for low-poly look
    const globeGeometry = new THREE.IcosahedronGeometry(5.5, 2);
    globeGeometry.computeVertexNormals();
    
    // Wireframe material for globe - shader for gradient effect
    const globeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color1: { value: new THREE.Color(0x6366f1) }, // Indigo
        color2: { value: new THREE.Color(0x3b82f6) }, // Blue
        opacity: { value: 0.3 },  // More intense in light mode
        isDarkMode: { value: window.matchMedia('(prefers-color-scheme: dark)').matches ? 1.0 : 0.0 }
      },
      vertexShader: `
        varying vec3 vPosition;
        varying float vDistance;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        
        void main() {
          vPosition = position;
          vDistance = length(position);
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color1;
        uniform vec3 color2;
        uniform float opacity;
        uniform float isDarkMode;
        varying vec3 vPosition;
        varying float vDistance;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        
        void main() {
          float gradient = (vPosition.y + 5.5) / 11.0;
          gradient = smoothstep(0.0, 1.0, gradient);
          
          // 라이트 모드에서는 더 진한 색상
          vec3 darkColor1 = isDarkMode > 0.5 ? color1 : color1 * 0.7;
          vec3 darkColor2 = isDarkMode > 0.5 ? color2 : color2 * 0.7;
          
          vec3 color = mix(darkColor1, darkColor2, gradient);
          
          // 시간에 따른 색상 변화 + 반짝임
          float pulse = sin(time * 0.5 + vDistance * 0.5) * 0.1 + 0.9;
          float shimmer = sin(time * 8.0 + vPosition.x * 10.0) * 
                         sin(time * 12.0 + vPosition.y * 10.0) * 0.1 + 0.9;
          color *= pulse * shimmer;
          
          // Rim lighting 효과 - 로우폴리에 맞게 더 날카롭게
          vec3 viewDir = normalize(vViewPosition);
          float rim = 1.0 - abs(dot(viewDir, vNormal));
          rim = pow(rim, 3.0); // 더 날카로운 엣지
          vec3 rimColor = isDarkMode > 0.5 ? vec3(0.5, 0.8, 1.0) : vec3(0.2, 0.4, 0.8);
          color += rim * rimColor * (isDarkMode > 0.5 ? 0.7 : 1.2);
          
          // 간헐적 플래시
          float flash = step(0.98, sin(time * 3.0 + vDistance * 5.0));
          color += flash * 0.3;
          
          // 라이트 모드에서 opacity 증가
          float finalOpacity = isDarkMode > 0.5 ? opacity : opacity * 1.5;
          
          gl_FragColor = vec4(color, finalOpacity + rim * 0.3);
        }
      `,
      wireframe: true,
      transparent: true
    });

    // Create globe mesh
    const globe = new THREE.Mesh(globeGeometry, globeMaterial);
    scene.add(globe);

    // Add additional wireframe sphere for complexity
    const innerGeometry = new THREE.IcosahedronGeometry(5.2, 1);
    const innerMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6b6b,
      wireframe: true,
      transparent: true,
      opacity: 0.25
    });
    const innerGlobe = new THREE.Mesh(innerGeometry, innerMaterial);
    globe.add(innerGlobe);

    // Get position attribute safely
    const positionAttribute = globeGeometry.getAttribute('position');
    if (!positionAttribute || !(positionAttribute instanceof THREE.BufferAttribute)) {
      console.error('Globe geometry missing position attribute');
      return;
    }
    
    const vertices = positionAttribute.array as Float32Array;
    const vertexCount = vertices.length / 3;
    const phases = new Float32Array(vertexCount);
    const sizes = new Float32Array(vertexCount);
    
    // 각 꼭짓점마다 랜덤 페이즈와 크기
    for (let i = 0; i < vertexCount; i++) {
      phases[i] = Math.random() * Math.PI * 2;
      if (Math.random() < 0.3) {
        sizes[i] = Math.random() * 10.0 + 8.0;
      } else {
        sizes[i] = Math.random() * 8.0 + 4.0;
      }
    }
    
    const dotGeometry = new THREE.BufferGeometry();
    dotGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    dotGeometry.setAttribute('phase', new THREE.Float32BufferAttribute(phases, 1));
    dotGeometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    
    // 간단한 애니메이션 셰이더
    const dotMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 }
      },
      vertexShader: `
        attribute float phase;
        attribute float size;
        uniform float time;
        varying float vIntensity;
        
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          
          // 각 별마다 다른 주기로 차분하게 깜빡임
          float t1 = time * 0.5 + phase * 6.28;
          float t2 = time * 0.3 + phase * 3.14;
          
          // 부드러운 사인파 조합
          float blink1 = sin(t1) * 0.5 + 0.5;
          float blink2 = sin(t2) * 0.5 + 0.5;
          
          // 부드러운 페이드 인/아웃
          blink1 = smoothstep(0.2, 0.8, blink1);
          blink2 = smoothstep(0.3, 0.7, blink2);
          
          // 최종 강도 계산
          vIntensity = blink1 * blink2;
          vIntensity = smoothstep(0.1, 0.9, vIntensity);
          
          // 크기 변화
          float sizeMultiplier = 0.2 + vIntensity * 1.3;
          gl_PointSize = size * sizeMultiplier;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vIntensity;
        
        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          float dist = length(coord);
          
          // 매우 가늘고 긴 십자가 광선
          float cross = 0.0;
          
          // 수평 광선
          float horizontal = exp(-pow(coord.y * 50.0, 2.0));
          horizontal *= 1.0 - smoothstep(0.15, 0.5, abs(coord.x));
          
          // 수직 광선
          float vertical = exp(-pow(coord.x * 50.0, 2.0));
          vertical *= 1.0 - smoothstep(0.15, 0.5, abs(coord.y));
          
          cross = horizontal + vertical;
          
          // 중심부 점
          float centerSize = mix(150.0, 50.0, vIntensity);
          float center = exp(-dist * dist * centerSize);
          
          // 전체 밝기
          float brightness = (cross * 2.0 + center * 3.0) * vIntensity;
          
          // 색수차 효과
          vec3 colorR = vIntensity > 0.5 ? vec3(1.0, 0.7, 0.7) : vec3(0.3, 0.2, 0.2);
          vec3 colorG = vIntensity > 0.5 ? vec3(0.7, 1.0, 0.7) : vec3(0.2, 0.3, 0.2);
          vec3 colorB = vIntensity > 0.5 ? vec3(0.7, 0.7, 1.0) : vec3(0.2, 0.2, 0.3);
          
          // 위치에 따른 색수차
          vec3 finalColor = colorR * (cross * (1.0 + coord.x * 0.2)) +
                           colorG * brightness +
                           colorB * (cross * (1.0 - coord.x * 0.2));
          
          finalColor = normalize(finalColor) * brightness;
          
          gl_FragColor = vec4(finalColor * 2.0, brightness);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    const dots = new THREE.Points(dotGeometry, dotMaterial);
    globe.add(dots);
    
    // 프리즘 효과
    const prismMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        attribute float phase;
        attribute float size;
        uniform float time;
        varying vec3 vColor;
        
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          
          // 시간과 위치에 따른 색상 변화
          float hue = time * 2.0 + phase * 12.56 + position.x * 0.5;
          
          vColor = vec3(
            sin(hue) * 0.5 + 0.5,
            sin(hue + 2.094) * 0.5 + 0.5,
            sin(hue + 4.189) * 0.5 + 0.5
          );
          
          float sparkle = sin(time * 10.0 + phase * 20.0) * 0.5 + 0.5;
          gl_PointSize = size * (1.5 + sparkle * 0.8);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          
          float prism = 1.0 - smoothstep(0.0, 0.3, dist);
          prism = pow(prism, 1.5);
          
          vec3 prismaticColor = vColor;
          float distortion = dist * 2.0;
          prismaticColor.r *= (1.0 + distortion * 0.3);
          prismaticColor.g *= (1.0 + distortion * 0.1);
          prismaticColor.b *= (1.0 - distortion * 0.2);
          
          float sparkle = pow(prism, 3.0);
          prismaticColor += vec3(sparkle) * 0.5;
          
          prismaticColor = prismaticColor * 4.0;
          
          gl_FragColor = vec4(prismaticColor, prism * 1.5);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    const prismDots = new THREE.Points(dotGeometry, prismMaterial);
    globe.add(prismDots);
    
    // 추가 프리즘 레이어
    const smallPrismGeometry = dotGeometry.clone();
    const smallPrismMaterial = prismMaterial.clone();
    if (smallPrismMaterial.uniforms?.time) {
      smallPrismMaterial.uniforms.time.value = Math.PI;
    }
    
    const smallPrismDots = new THREE.Points(smallPrismGeometry, smallPrismMaterial);
    smallPrismDots.scale.set(0.95, 0.95, 0.95);
    globe.add(smallPrismDots);

    // 동적 연결선
    const connectionGroup = new THREE.Group();
    const connections: THREE.Line[] = [];
    
    const connectionMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        opacity: { value: 0.2 }
      },
      vertexShader: `
        uniform float time;
        attribute float lineDistance;
        varying float vLineDistance;
        varying float vPulse;
        
        void main() {
          vLineDistance = lineDistance;
          vPulse = sin(time * 3.0 - lineDistance * 10.0) * 0.5 + 0.5;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float opacity;
        varying float vLineDistance;
        varying float vPulse;
        
        void main() {
          float alpha = opacity * vPulse * (1.0 - vLineDistance);
          vec3 color = vec3(0.5, 0.8, 1.0);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    globe.add(connectionGroup);

    // Check for shader compilation
    const checkShaderCompilation = (material: THREE.ShaderMaterial, name: string) => {
      material.onBeforeCompile = () => {
        console.log(`${name} shader compiled successfully`);
      };
    };
    
    checkShaderCompilation(globeMaterial as THREE.ShaderMaterial, 'Globe');
    checkShaderCompilation(dotMaterial, 'Dot');
    
    // 번개 효과
    const lightningMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        varying vec3 vPosition;
        void main() {
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec3 vPosition;
        
        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }
        
        void main() {
          float lightning = step(0.99, sin(time * 10.0 + vPosition.x * 20.0));
          float branch = random(vec2(floor(time * 10.0), vPosition.y));
          float path = abs(vPosition.x - branch * 0.5);
          float intensity = lightning * exp(-path * 30.0) * (0.5 + random(vec2(time, vPosition.z)));
          
          vec3 lightningColor = vec3(0.7, 0.8, 1.0) * 3.0;
          
          if (intensity < 0.01) discard;
          
          gl_FragColor = vec4(lightningColor, intensity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    
    // 여러 번개 레이어
    for (let i = 0; i < 3; i++) {
      const lightningGlobe = new THREE.Mesh(globeGeometry.clone(), lightningMaterial.clone());
      lightningGlobe.scale.set(1.01 + i * 0.01, 1.01 + i * 0.01, 1.01 + i * 0.01);
      lightningGlobe.rotation.y = i * Math.PI / 3;
      lightningGlobe.userData.speed = 1 + i * 0.5;
      globe.add(lightningGlobe);
    }
    
    // 대기 글로우 효과
    const atmosphereGeometry = new THREE.SphereGeometry(6.2, 32, 32);
    const atmosphereMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          float pulse = sin(time * 2.0) * 0.1 + 0.9;
          
          float height = (vPosition.y + 6.2) / 12.4;
          vec3 color = mix(
            vec3(0.1, 0.3, 0.8),
            vec3(0.8, 0.3, 0.9),
            height
          );
          
          gl_FragColor = vec4(color, intensity * 0.15 * pulse);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false
    });
    
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphere);
    
    // Store references
    sceneRef.current = { scene, camera, renderer, globe, particles: null };
    
    // Store vertices reference for animation
    const verticesRef = vertices;
    const vertexCountRef = vertexCount;

    // Performance monitoring
    const checkPerformance = () => {
      if (!renderer) return;
      
      const info = renderer.info;
      const fps = info.render.frame;
      
      if (fps < 30 && performanceModeRef.current !== 'low') {
        performanceModeRef.current = 'low';
        renderer.setPixelRatio(1);
        console.log('Switching to low performance mode');
      } else if (fps > 50 && performanceModeRef.current === 'low') {
        performanceModeRef.current = 'medium';
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      }
    };
    
    // Visibility change handler
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
      
      if (!isVisibleRef.current) {
        if (animationIdRef.current) {
          cancelAnimationFrame(animationIdRef.current);
        }
      } else {
        animate();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Animation
    let frameCount = 0;
    const startTime = Date.now();
    // let lastFrameTime = performance.now();
    
    const animate = () => {
      if (!sceneRef.current || !isVisibleRef.current) return;
      
      // const currentTime = performance.now();
      // const deltaTime = Math.min((currentTime - lastFrameTime) / 1000, 0.1);
      // lastFrameTime = currentTime;
      
      frameCount++;
      const time = (Date.now() - startTime) * 0.001;
      
      // Update shader time
      if (globeMaterial.uniforms?.time) {
        globeMaterial.uniforms.time.value = time;
      }
      if (frameCount % 30 === 0 && globeMaterial.uniforms?.isDarkMode) {
        globeMaterial.uniforms.isDarkMode.value = window.matchMedia('(prefers-color-scheme: dark)').matches ? 1.0 : 0.0;
      }
      
      // Update dot glow time
      if (dotMaterial.uniforms?.time) {
        dotMaterial.uniforms.time.value = time;
      }
      
      // Update prism time
      if (prismMaterial.uniforms?.time) {
        prismMaterial.uniforms.time.value = time * 1.5;
      }
      
      // Update small prism time
      if (smallPrismMaterial.uniforms?.time) {
        smallPrismMaterial.uniforms.time.value = time * 2.0 + Math.PI;
      }
      
      // Update connection time
      if (connectionMaterial.uniforms?.time) {
        connectionMaterial.uniforms.time.value = time;
      }
      
      // Update lightning times
      globe.children.forEach((child) => {
        if (child instanceof THREE.Mesh && child.material && 'uniforms' in child.material) {
          const mat = child.material as THREE.ShaderMaterial;
          if (mat.uniforms?.time) {
            mat.uniforms.time.value = time * (child.userData.speed || 1);
          }
        }
      });
      
      // Update atmosphere time
      if (atmosphereMaterial.uniforms?.time) {
        atmosphereMaterial.uniforms.time.value = time;
      }
      
      // 동적 연결선 생성
      if (frameCount % 180 === 0 && connectionGroup.children.length < 5 && verticesRef) {
        const idx1 = Math.floor(Math.random() * vertexCountRef);
        const idx2 = Math.floor(Math.random() * vertexCountRef);
        
        if (idx1 !== idx2) {
          const p1 = new THREE.Vector3(
            verticesRef[idx1 * 3] || 0,
            verticesRef[idx1 * 3 + 1] || 0,
            verticesRef[idx1 * 3 + 2] || 0
          );
          const p2 = new THREE.Vector3(
            verticesRef[idx2 * 3] || 0,
            verticesRef[idx2 * 3 + 1] || 0,
            verticesRef[idx2 * 3 + 2] || 0
          );
          
          const distance = p1.distanceTo(p2);
          if (distance < 5.0 && distance > 1.5) {
            const curve = new THREE.LineCurve3(p1, p2);
            const points = curve.getPoints(20);
            const connectionGeometry = new THREE.BufferGeometry().setFromPoints(points);
            
            const connection = new THREE.Line(connectionGeometry, connectionMaterial.clone());
            connection.userData.birthTime = time;
            connectionGroup.add(connection);
            connections.push(connection);
          }
        }
      }
      
      // 오래된 연결선 제거
      connectionGroup.children = connectionGroup.children.filter((child) => {
        if (child instanceof THREE.Line) {
          const age = time - child.userData.birthTime;
          if (age > 3.0) {
            child.geometry.dispose();
            if (child.material && 'dispose' in child.material) {
              (child.material as THREE.Material).dispose();
            }
            return false;
          }
          if ('uniforms' in child.material) {
            const mat = child.material as THREE.ShaderMaterial;
            if (mat.uniforms?.opacity) {
              mat.uniforms.opacity.value = 0.2 * (1.0 - age / 3.0);
            }
          }
        }
        return true;
      });
      
      // Performance check
      if (frameCount % 120 === 0) {
        checkPerformance();
      }
      
      if (frameCount % 300 === 0 && process.env.NODE_ENV === 'development') {
        console.log('Globe animation:', { frame: frameCount, time, performance: performanceModeRef.current });
      }
      
      // Rotate globe
      globe.rotation.x = time * 0.01;
      globe.rotation.y = time * 0.02;
      
      // Counter-rotate inner globe
      innerGlobe.rotation.x = -time * 0.008;
      innerGlobe.rotation.y = -time * 0.015;
      
      // 지구본에 약간의 회전 관성 추가
      const inertia = Math.sin(time * 0.05) * 0.01;
      globe.rotation.x += inertia;
      globe.rotation.y += inertia * 0.5;
      
      renderer.render(scene, camera);
      animationIdRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      if (!sceneRef.current) return;
      
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      globeGeometry.dispose();
      globeMaterial.dispose();
      innerGeometry.dispose();
      innerMaterial.dispose();
      dotGeometry.dispose();
      dotMaterial.dispose();
      prismMaterial.dispose();
      smallPrismGeometry.dispose();
      smallPrismMaterial.dispose();
      connectionMaterial.dispose();
      // Lightning materials cleanup
      globe.children.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.material && 'dispose' in child.material) {
            (child.material as THREE.Material).dispose();
          }
        }
      });
      atmosphereGeometry.dispose();
      atmosphereMaterial.dispose();
      connectionGroup.children.forEach((child) => {
        if (child instanceof THREE.Line) {
          child.geometry.dispose();
          if (child.material && 'dispose' in child.material) {
            (child.material as THREE.Material).dispose();
          }
        }
      });
    };
  }, []);

  return (
    <div 
      ref={mountRef} 
      className={`fixed inset-0 pointer-events-none ${className}`}
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        filter: 'blur(1px)',
        transform: 'scale(1.02)'
      }}
    />
  );
};