import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Stars, Sphere, MeshDistortMaterial } from '@react-three/drei';

const AnimatedShape = ({ position, color, distort }) => {
  const meshRef = useRef();
  
  useFrame((state) => {
    meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.2;
    meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.3;
  });

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={2} position={position}>
      <Sphere ref={meshRef} args={[1, 64, 64]} scale={2}>
        <MeshDistortMaterial 
          color={color} 
          envMapIntensity={1} 
          clearcoat={1} 
          clearcoatRoughness={0} 
          metalness={0.8} 
          roughness={0.2} 
          distort={distort} 
          speed={2} 
        />
      </Sphere>
    </Float>
  );
};

export default function Background3D() {
  return (
    <div className="canvas-container">
      <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} color="#FF5A5F" />
        <directionalLight position={[-10, -10, -5]} intensity={0.5} color="#087E8B" />
        <directionalLight position={[0, 0, -10]} intensity={1} color="#FFD166" />
        
        <Stars radius={100} depth={50} count={3000} factor={4} saturation={1} fade speed={1} />
        
        {/* Colorful floating shapes */}
        <AnimatedShape position={[-4, 2, -2]} color="#FF5A5F" distort={0.4} />
        <AnimatedShape position={[5, -3, -5]} color="#087E8B" distort={0.6} />
        <AnimatedShape position={[-3, -4, -4]} color="#FFD166" distort={0.3} />
        <AnimatedShape position={[4, 4, -8]} color="#9D4EDD" distort={0.5} />
      </Canvas>
    </div>
  );
}
