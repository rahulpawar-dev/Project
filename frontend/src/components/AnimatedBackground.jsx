import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const AnimatedBackground = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);

    // Create animated geometries
    const meshes = [];

    for (let i = 0; i < 5; i++) {
      const geometry = new THREE.IcosahedronGeometry(1 + Math.random() * 0.5, 4);
      const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color().setHSL(0.6 + Math.random() * 0.2, 0.7, 0.5),
        emissive: new THREE.Color().setHSL(0.6 + Math.random() * 0.2, 0.7, 0.3),
        wireframe: false,
        flatShading: true,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.x = (Math.random() - 0.5) * 10;
      mesh.position.y = (Math.random() - 0.5) * 10;
      mesh.position.z = (Math.random() - 0.5) * 10;
      mesh.rotation.x = Math.random() * Math.PI;
      mesh.rotation.y = Math.random() * Math.PI;

      scene.add(mesh);
      meshes.push({
        mesh,
        rotationSpeed: {
          x: (Math.random() - 0.5) * 0.005,
          y: (Math.random() - 0.5) * 0.005,
          z: (Math.random() - 0.5) * 0.005,
        },
        positionSpeed: {
          x: (Math.random() - 0.5) * 0.01,
          y: (Math.random() - 0.5) * 0.01,
        },
      });
    }

    // Lighting
    const light1 = new THREE.PointLight(0x667eea, 1, 100);
    light1.position.set(5, 5, 5);
    scene.add(light1);

    const light2 = new THREE.PointLight(0x764ba2, 0.8, 100);
    light2.position.set(-5, -5, 5);
    scene.add(light2);

    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    let animationFrameId;
    // Animation loop
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      meshes.forEach((item) => {
        item.mesh.rotation.x += item.rotationSpeed.x;
        item.mesh.rotation.y += item.rotationSpeed.y;
        item.mesh.rotation.z += item.rotationSpeed.z;

        item.mesh.position.x += item.positionSpeed.x;
        item.mesh.position.y += item.positionSpeed.y;

        // Bounce back if out of bounds
        if (Math.abs(item.mesh.position.x) > 8)
          item.positionSpeed.x *= -1;
        if (Math.abs(item.mesh.position.y) > 8)
          item.positionSpeed.y *= -1;
      });

      renderer.render(scene, camera);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener('resize', handleResize);

      meshes.forEach(({ mesh }) => {
        scene.remove(mesh);
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((material) => material.dispose());
        } else {
          mesh.material.dispose();
        }
      });

      renderer.dispose();

      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
      }}
    />
  );
};

export default AnimatedBackground;
