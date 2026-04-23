import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const HealthTips3D = () => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);

  useEffect(() => {
    if (!sceneRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 300 / 200, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(300, 200);
    renderer.setClearColor(0x000000, 0);
    sceneRef.current.appendChild(renderer.domElement);

    // Create floating health icons
    const icons = ['🏃‍♂️', '💪', '🧘‍♀️', '🥗', '💧'];
    const meshes = [];

    icons.forEach((_, index) => {
      // Create 3D text geometry (simplified as cubes for now)
      const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color().setHSL(index * 0.2, 0.7, 0.5),
        transparent: true,
        opacity: 0.8,
      });
      const mesh = new THREE.Mesh(geometry, material);

      // Position in a circle
      const angle = (index / icons.length) * Math.PI * 2;
      mesh.position.x = Math.cos(angle) * 2;
      mesh.position.y = Math.sin(angle) * 2;
      mesh.position.z = Math.sin(Date.now() * 0.001 + index) * 0.5;

      scene.add(mesh);
      meshes.push({
        mesh,
        originalY: mesh.position.y,
        speed: 0.01 + index * 0.005,
      });
    });

    // Lighting
    const light = new THREE.PointLight(0x667eea, 1, 100);
    light.position.set(5, 5, 5);
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    let animationFrameId;
    // Animation
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      meshes.forEach((item, index) => {
        item.mesh.rotation.x += item.speed;
        item.mesh.rotation.y += item.speed * 0.7;
        item.mesh.position.y = item.originalY + Math.sin(Date.now() * 0.001 + index) * 0.3;
      });

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

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

      if (sceneRef.current && sceneRef.current.contains(renderer.domElement)) {
        sceneRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  const tips = [
    { title: "Stay Hydrated", desc: "Drink 8 glasses of water daily", icon: "💧" },
    { title: "Daily Exercise", desc: "30 minutes of physical activity", icon: "🏃‍♂️" },
    { title: "Healthy Eating", desc: "Include fruits and vegetables", icon: "🥗" },
    { title: "Mindful Breathing", desc: "Practice deep breathing exercises", icon: "🧘‍♀️" },
    { title: "Regular Check-ups", desc: "Annual health screenings", icon: "🏥" },
  ];

  return (
    <div ref={containerRef} className="health-tips-3d">
      <div className="health-3d-visual" ref={sceneRef}></div>
      <div className="health-tips-content">
        <h3>Daily Health Tips</h3>
        <div className="tips-grid">
          {tips.map((tip, index) => (
            <div key={index} className="tip-item">
              <span className="tip-icon">{tip.icon}</span>
              <div className="tip-text">
                <h4>{tip.title}</h4>
                <p>{tip.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HealthTips3D;
