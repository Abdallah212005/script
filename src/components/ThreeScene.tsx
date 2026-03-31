import React, { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { 
  PerspectiveCamera, 
  Float, 
  MeshTransmissionMaterial,
  Grid,
  Sparkles
} from '@react-three/drei';
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { COLORS } from '../constants';

export function CyberGrid() {
  const gridRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (!gridRef.current) return;
    const t = state.clock.getElapsedTime();
    gridRef.current.position.z = (t * 2) % 10;
  });

  return (
    <group ref={gridRef} position={[0, -5, 0]}>
      <Grid
        args={[100, 100]}
        sectionSize={10}
        sectionThickness={1.5}
        sectionColor={COLORS.purple}
        cellSize={2}
        cellThickness={0.8}
        cellColor={COLORS.glow}
        fadeDistance={50}
        fadeStrength={1.5}
        infiniteGrid
      />
    </group>
  );
}

export function DataStream({ position, speed, color }: { position: [number, number, number], speed: number, color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.position.z += speed;
    if (ref.current.position.z > 25) ref.current.position.z = -25;
    
    const t = state.clock.getElapsedTime();
    if (ref.current.material instanceof THREE.MeshBasicMaterial) {
      ref.current.material.opacity = 0.3 + Math.sin(t * 5 + position[0]) * 0.2;
    }
  });

  return (
    <mesh ref={ref} position={position}>
      <boxGeometry args={[0.05, 0.05, 4]} />
      <meshBasicMaterial color={color} transparent opacity={0.5} />
    </mesh>
  );
}

export function DigitalRain() {
  const count = 15;
  return (
    <group>
      {Array.from({ length: count }).map((_, i) => (
        <DataStream 
          key={`stream-${i}`}
          position={[
            (Math.random() - 0.5) * 50,
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 50
          ]}
          speed={0.1 + Math.random() * 0.2}
          color={i % 2 === 0 ? COLORS.yellow : COLORS.accent}
        />
      ))}
    </group>
  );
}

export function Electron({ rotation, delay = 0, color }: { rotation: number, delay?: number, color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime() * 1.5 + delay;
    const x = Math.cos(t) * 6;
    const y = Math.sin(t) * 6 * 0.35;
    ref.current.position.set(x, y, 0);
  });

  return (
    <group rotation={[0, 0, rotation]}>
      <mesh ref={ref}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial 
          color={color} 
          emissive={color} 
          emissiveIntensity={3} 
          metalness={1} 
          roughness={0} 
        />
        <pointLight intensity={3} distance={6} color={color} />
      </mesh>
    </group>
  );
}

export function TechCore() {
  const groupRef = useRef<THREE.Group>(null);
  const nucleusRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!groupRef.current || !nucleusRef.current || !innerRef.current) return;
    const t = state.clock.getElapsedTime();
    
    groupRef.current.rotation.y = t * 0.1;
    groupRef.current.rotation.z = Math.sin(t * 0.2) * 0.05;
    
    const s = 1 + Math.sin(t * 2) * 0.05;
    nucleusRef.current.scale.set(s, s, s);
    innerRef.current.rotation.x = t * 2;
    innerRef.current.rotation.y = t * 1.5;
    
    groupRef.current.position.y = 2 + Math.sin(t * 0.5) * 0.3;
  });

  return (
    <Float speed={2.5} rotationIntensity={0.4} floatIntensity={0.8}>
      <group ref={groupRef} position={[0, 2, 0]}>
        <mesh ref={innerRef}>
          <octahedronGeometry args={[0.8, 0]} />
          <meshStandardMaterial 
            color={COLORS.yellow} 
            emissive={COLORS.yellow} 
            emissiveIntensity={4} 
            wireframe
          />
        </mesh>

        <mesh ref={nucleusRef}>
          <sphereGeometry args={[1.6, 16, 16]} />
          <MeshTransmissionMaterial
            backside
            samples={4}
            thickness={1.5}
            chromaticAberration={0.08}
            anisotropy={0.2}
            distortion={0.2}
            distortionScale={0.2}
            temporalDistortion={0.1}
            color={COLORS.purple}
            attenuationDistance={0.8}
            attenuationColor={COLORS.purple}
          />
        </mesh>

        {[0, Math.PI / 3, -Math.PI / 3].map((rotation, i) => (
          <group key={`orbit-ring-${i}-${rotation}`} rotation={[0, 0, rotation]}>
            <mesh scale={[1, 0.35, 1]}>
              <torusGeometry args={[6, 0.04, 16, 120]} />
              <meshStandardMaterial 
                color={COLORS.yellow} 
                emissive={COLORS.yellow}
                emissiveIntensity={0.5}
                metalness={1}
                roughness={0.1}
                transparent
                opacity={0.4}
              />
            </mesh>
          </group>
        ))}

        <Electron rotation={0} color={COLORS.yellow} />
        <Electron rotation={Math.PI / 3} delay={Math.PI * 0.6} color={COLORS.accent} />
        <Electron rotation={-Math.PI / 3} delay={Math.PI * 1.2} color={COLORS.yellow} />
        
        <pointLight intensity={10} distance={25} color={COLORS.glow} />
      </group>
    </Float>
  );
}

export function TechIcon({ position, type }: { position: [number, number, number], type: 'cpu' | 'gamepad' | 'globe' }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHover] = useState(false);
  const [clicked, setClick] = useState(false);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    
    meshRef.current.rotation.y += 0.01;
    meshRef.current.position.y = position[1] + Math.sin(t + position[0]) * 0.1;
    
    const targetScale = clicked ? 1.4 : hovered ? 1.2 : 1;
    meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    
    const targetIntensity = clicked ? 2 : hovered ? 1.5 : 0.5;
    if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
      meshRef.current.material.emissiveIntensity = THREE.MathUtils.lerp(
        meshRef.current.material.emissiveIntensity,
        targetIntensity,
        0.1
      );
    }
  });

  return (
    <mesh 
      ref={meshRef} 
      position={position}
      onClick={() => setClick(!clicked)}
      onPointerOver={() => {
        setHover(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHover(false);
        document.body.style.cursor = 'auto';
      }}
    >
      {type === 'cpu' && <boxGeometry args={[1, 1, 0.2]} />}
      {type === 'gamepad' && <torusGeometry args={[0.5, 0.2, 16, 32]} />}
      {type === 'globe' && <sphereGeometry args={[0.6, 32, 32]} />}
      <meshPhysicalMaterial 
        color={COLORS.yellow} 
        emissive={COLORS.yellow} 
        emissiveIntensity={0.5} 
        metalness={1} 
        roughness={0.05} 
        clearcoat={1}
        clearcoatRoughness={0.1}
        reflectivity={1}
      />
    </mesh>
  );
}

function Rig() {
  const { camera, mouse } = useThree();
  const vec = new THREE.Vector3();
  return useFrame(() => {
    camera.position.lerp(vec.set(mouse.x * 3, 2 + mouse.y * 1.5, 20), 0.05);
    camera.lookAt(0, 2, 0);
  });
}

export function Scene() {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 2, 20]} fov={50} />
      <Rig />
      
      <fog attach="fog" args={[COLORS.dark, 10, 40]} />
      <ambientLight intensity={0.4} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} />
      
      <TechCore />
      <DigitalRain />
      <CyberGrid />
      
      <group position={[0, 0, -5]}>
        <Sparkles 
          count={50} 
          scale={40} 
          size={2} 
          speed={0.3} 
          color={COLORS.yellow} 
          opacity={0.4}
        />
        <Sparkles 
          count={40} 
          scale={30} 
          size={4} 
          speed={0.5} 
          color={COLORS.purple} 
          opacity={0.3}
        />
      </group>

      <EffectComposer>
        <Bloom 
          luminanceThreshold={0.2} 
          mipmapBlur 
          intensity={1.2} 
          radius={0.3} 
        />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
        <Noise opacity={0.02} />
      </EffectComposer>
    </>
  );
}
