import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';

const Exercise3DCard = ({
  title = 'Daily Activity',
  description = 'Stay on track with your progress',
  icon = '🏃‍♂️',
  progress = 0,
  color = '#667eea',
}) => {
  const cardRef = useRef(null);
  const sceneRef = useRef(null);
  const parsedProgress = Number(progress);
  const safeProgress = Number.isFinite(parsedProgress)
    ? Math.min(100, Math.max(0, parsedProgress))
    : 0;
  const safeColor = typeof color === 'string' && color.trim() ? color : '#667eea';

  useEffect(() => {
    if (!sceneRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 200 / 150, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(200, 150);
    renderer.setClearColor(0x000000, 0);
    sceneRef.current.appendChild(renderer.domElement);

    // Create 3D progress ring
    const geometry = new THREE.RingGeometry(1.5, 1.8, 32);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(safeColor),
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(geometry, material);
    scene.add(ring);

    // Create progress arc
    const progressGeometry = new THREE.RingGeometry(
      1.5,
      1.8,
      32,
      1,
      0,
      (safeProgress / 100) * Math.PI * 2
    );
    const progressMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(safeColor),
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
    });
    const progressRing = new THREE.Mesh(progressGeometry, progressMaterial);
    scene.add(progressRing);

    let animationFrameId;
    // Animation
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      ring.rotation.z += 0.01;
      progressRing.rotation.z += 0.01;
      renderer.render(scene, camera);
    };
    animate();

    // Hover effect
    const handleMouseEnter = () => {
      gsap.to(cardRef.current, {
        scale: 1.05,
        duration: 0.3,
        ease: 'power2.out',
      });
    };

    const handleMouseLeave = () => {
      gsap.to(cardRef.current, {
        scale: 1,
        duration: 0.3,
        ease: 'power2.out',
      });
    };

    cardRef.current.addEventListener('mouseenter', handleMouseEnter);
    cardRef.current.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      cardRef.current?.removeEventListener('mouseenter', handleMouseEnter);
      cardRef.current?.removeEventListener('mouseleave', handleMouseLeave);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      geometry.dispose();
      material.dispose();
      progressGeometry.dispose();
      progressMaterial.dispose();
      renderer.dispose();

      if (sceneRef.current && sceneRef.current.contains(renderer.domElement)) {
        sceneRef.current.removeChild(renderer.domElement);
      }
    };
  }, [safeProgress, safeColor]);

  return (
    <div ref={cardRef} className="exercise-3d-card">
      <div className="exercise-3d-visual" ref={sceneRef}></div>
      <div className="exercise-content">
        <div className="exercise-icon">{icon}</div>
        <h3>{title}</h3>
        <p>{description}</p>
        <div className="exercise-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${safeProgress}%`, backgroundColor: safeColor }}
            ></div>
          </div>
          <span className="progress-text">{Math.round(safeProgress)}%</span>
        </div>
      </div>
    </div>
  );
};

export default Exercise3DCard;
