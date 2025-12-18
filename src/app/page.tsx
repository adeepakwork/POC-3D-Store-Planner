'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

function RotatingShelf() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.3;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Shelf structure */}
      {/* Left side */}
      <mesh position={[-1.2, 0, 0]}>
        <boxGeometry args={[0.1, 2, 0.5]} />
        <meshStandardMaterial color="#4a5568" />
      </mesh>
      {/* Right side */}
      <mesh position={[1.2, 0, 0]}>
        <boxGeometry args={[0.1, 2, 0.5]} />
        <meshStandardMaterial color="#4a5568" />
      </mesh>
      {/* Shelves */}
      {[-0.7, 0, 0.7].map((y, i) => (
        <mesh key={i} position={[0, y, 0]}>
          <boxGeometry args={[2.3, 0.05, 0.5]} />
          <meshStandardMaterial color="#718096" />
        </mesh>
      ))}
      {/* Boxes on shelves */}
      <mesh position={[-0.5, 0.85, 0]}>
        <boxGeometry args={[0.3, 0.25, 0.25]} />
        <meshStandardMaterial color="#3182ce" />
      </mesh>
      <mesh position={[0.2, 0.85, 0]}>
        <boxGeometry args={[0.4, 0.25, 0.25]} />
        <meshStandardMaterial color="#38a169" />
      </mesh>
      <mesh position={[0.7, 0.85, 0]}>
        <boxGeometry args={[0.25, 0.25, 0.25]} />
        <meshStandardMaterial color="#d69e2e" />
      </mesh>
      <mesh position={[-0.6, 0.15, 0]}>
        <boxGeometry args={[0.35, 0.25, 0.25]} />
        <meshStandardMaterial color="#e53e3e" />
      </mesh>
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[0.3, 0.25, 0.25]} />
        <meshStandardMaterial color="#805ad5" />
      </mesh>
      <mesh position={[0.5, 0.15, 0]}>
        <boxGeometry args={[0.35, 0.25, 0.25]} />
        <meshStandardMaterial color="#3182ce" />
      </mesh>
      <mesh position={[-0.4, -0.55, 0]}>
        <boxGeometry args={[0.5, 0.25, 0.25]} />
        <meshStandardMaterial color="#38a169" />
      </mesh>
      <mesh position={[0.4, -0.55, 0]}>
        <boxGeometry args={[0.5, 0.25, 0.25]} />
        <meshStandardMaterial color="#d69e2e" />
      </mesh>
    </group>
  );
}

function Scene3D() {
  return (
    <Canvas camera={{ position: [3, 2, 3], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <RotatingShelf />
      <OrbitControls enableZoom={false} enablePan={false} autoRotate={false} />
    </Canvas>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4">
        {/* 3D Viewer */}
        <div className="w-64 h-64 mb-8">
          <Scene3D />
        </div>

        <h1 className="text-4xl font-bold text-gray-900 mb-4 text-center">
          3D Store Planner
        </h1>

        <p className="text-gray-600 mb-10 text-center max-w-md">
          Design your store layout in 2D and visualize it in 3D
        </p>

        <div className="flex gap-4">
          <Link
            href="/login"
            className="px-6 py-3 bg-gray-900 text-white font-medium rounded hover:bg-gray-800 transition-colors"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="px-6 py-3 border border-gray-900 text-gray-900 font-medium rounded hover:bg-gray-100 transition-colors"
          >
            Register
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-gray-500 text-sm">
        Created by Adeepa K
      </footer>
    </div>
  );
}
