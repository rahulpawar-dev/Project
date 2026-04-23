import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import './AnimatedCard.css';

const AnimatedCard = ({ children, className = '', delay = 0 }) => {
  const cardRef = useRef(null);

  useEffect(() => {
    if (!cardRef.current) return;

    // Entrance animation
    gsap.from(cardRef.current, {
      opacity: 0,
      y: 30,
      scale: 0.9,
      duration: 0.8,
      delay,
      ease: 'back.out',
    });

    // Hover animation
    const card = cardRef.current;
    const tl = gsap.timeline({ paused: true });

    tl.to(
      card,
      {
        y: -8,
        boxShadow:
          '0 20px 40px rgba(102, 126, 234, 0.4), 0 0 20px rgba(102, 126, 234, 0.2)',
        duration: 0.3,
        ease: 'power2.out',
      },
      0
    ).to(
      card,
      {
        "--card-glow": 1,
        duration: 0.3,
        ease: 'power2.out',
      },
      0
    );

    const handleMouseEnter = () => tl.play();
    const handleMouseLeave = () => tl.reverse();
    card.addEventListener('mouseenter', handleMouseEnter);
    card.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      card.removeEventListener('mouseenter', handleMouseEnter);
      card.removeEventListener('mouseleave', handleMouseLeave);
      tl.kill();
    };
  }, [delay]);

  return (
    <div ref={cardRef} className={`animated-card ${className}`}>
      {children}
    </div>
  );
};

export default AnimatedCard;
