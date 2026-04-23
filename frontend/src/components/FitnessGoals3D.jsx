import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const FitnessGoals3D = () => {
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

    // Create 3D progress bars
    const goals = [
      { name: 'Steps', current: 8500, target: 10000, color: '#667eea' },
      { name: 'Calories', current: 1800, target: 2200, color: '#764ba2' },
      { name: 'Water', current: 6, target: 8, color: '#f093fb' },
    ];

    const bars = [];

    goals.forEach((goal, index) => {
      const progress = (goal.current / goal.target) * 100;

      // Background bar
      const bgGeometry = new THREE.BoxGeometry(2, 0.2, 0.1);
      const bgMaterial = new THREE.MeshBasicMaterial({
        color: 0x333333,
        transparent: true,
        opacity: 0.3,
      });
      const bgBar = new THREE.Mesh(bgGeometry, bgMaterial);
      bgBar.position.y = index * 0.8 - 0.8;
      scene.add(bgBar);

      // Progress bar
      const progressGeometry = new THREE.BoxGeometry((progress / 100) * 2, 0.15, 0.15);
      const progressMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(goal.color),
      });
      const progressBar = new THREE.Mesh(progressGeometry, progressMaterial);
      progressBar.position.x = -(1 - progress / 100);
      progressBar.position.y = index * 0.8 - 0.8;
      scene.add(progressBar);

      bars.push({ bgBar, progressBar });
    });

    // Lighting
    const light = new THREE.PointLight(0xffffff, 1, 100);
    light.position.set(5, 5, 5);
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    let animationFrameId;
    // Animation
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      bars.forEach((bar) => {
        bar.progressBar.rotation.y += 0.005;
        bar.bgBar.rotation.y += 0.002;
      });

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      bars.forEach(({ bgBar, progressBar }) => {
        scene.remove(bgBar);
        scene.remove(progressBar);
        bgBar.geometry.dispose();
        progressBar.geometry.dispose();
        if (Array.isArray(bgBar.material)) {
          bgBar.material.forEach((material) => material.dispose());
        } else {
          bgBar.material.dispose();
        }
        if (Array.isArray(progressBar.material)) {
          progressBar.material.forEach((material) => material.dispose());
        } else {
          progressBar.material.dispose();
        }
      });

      renderer.dispose();

      if (sceneRef.current && sceneRef.current.contains(renderer.domElement)) {
        sceneRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  const goals = [
    { name: 'Daily Steps', current: 8500, target: 10000, unit: 'steps', color: '#667eea' },
    { name: 'Calories Burned', current: 1800, target: 2200, unit: 'cal', color: '#764ba2' },
    { name: 'Water Intake', current: 6, target: 8, unit: 'glasses', color: '#f093fb' },
  ];

  return (
    <div ref={containerRef} className="fitness-goals-3d">
      <div className="fitness-3d-visual" ref={sceneRef}></div>
      <div className="fitness-goals-content">
        <h3>Fitness Goals</h3>
        <div className="goals-list">
          {goals.map((goal, index) => {
            const progress = (goal.current / goal.target) * 100;
            return (
              <div key={index} className="goal-item">
                <div className="goal-header">
                  <span className="goal-name">{goal.name}</span>
                  <span className="goal-value">{goal.current}/{goal.target} {goal.unit}</span>
                </div>
                <div className="goal-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${progress}%`,
                        backgroundColor: goal.color,
                        boxShadow: `0 0 10px ${goal.color}40`
                      }}
                    ></div>
                  </div>
                  <span className="progress-percent">{Math.round(progress)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FitnessGoals3D;
