import gsap from 'gsap';

// Card entrance animation
export const animateCardEntrance = (element) => {
  if (!element) return;

  gsap.from(element, {
    duration: 0.8,
    opacity: 0,
    y: 30,
    scale: 0.9,
    ease: 'back.out',
  });
};

// Stagger cards animation
export const animateCardsStagger = (elements) => {
  gsap.from(elements, {
    duration: 0.8,
    opacity: 0,
    y: 30,
    scale: 0.9,
    stagger: 0.1,
    ease: 'back.out',
  });
};

// Button hover animation
export const animateButtonHover = (element) => {
  const tl = gsap.timeline({ paused: true });

  tl.to(element, {
    scale: 1.05,
    boxShadow: '0 10px 30px rgba(102, 126, 234, 0.5)',
    duration: 0.3,
    ease: 'power2.out',
  });

  element.addEventListener('mouseenter', () => tl.play());
  element.addEventListener('mouseleave', () => tl.reverse());

  return tl;
};

// Number counter animation
export const animateCounter = (element, start, end, duration = 2) => {
  gsap.to(
    { value: start },
    {
      value: end,
      duration,
      ease: 'power2.out',
      onUpdate: function () {
        element.textContent = Math.ceil(this.targets()[0].value);
      },
    }
  );
};

// Floating animation
export const animateFloating = (element) => {
  gsap.to(element, {
    y: -10,
    duration: 3,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut',
  });
};

// Glow effect animation
export const animateGlow = (element) => {
  gsap.to(element, {
    boxShadow: [
      '0 0 10px rgba(102, 126, 234, 0.3)',
      '0 0 20px rgba(102, 126, 234, 0.6)',
      '0 0 10px rgba(102, 126, 234, 0.3)',
    ],
    duration: 2,
    repeat: -1,
    ease: 'sine.inOut',
  });
};

// Pulse animation
export const animatePulse = (element) => {
  gsap.to(element, {
    scale: [1, 1.1, 1],
    duration: 1.5,
    repeat: -1,
    ease: 'sine.inOut',
  });
};

// Rotate animation
export const animateRotate = (element, duration = 10) => {
  gsap.to(element, {
    rotation: 360,
    duration,
    repeat: -1,
    ease: 'none',
  });
};

// Shake animation
export const animateShake = (element) => {
  gsap.to(element, {
    x: [-5, 5, -5, 5, 0],
    duration: 0.5,
    ease: 'power2.out',
  });
};

// Slide in animation
export const animateSlideIn = (element, direction = 'left', duration = 0.8) => {
  const startValue = direction === 'left' ? -300 : 300;

  gsap.from(element, {
    x: startValue,
    opacity: 0,
    duration,
    ease: 'power3.out',
  });
};

// Text reveal animation
export const animateTextReveal = (element) => {
  gsap.from(element, {
    opacity: 0,
    y: 20,
    duration: 0.6,
    stagger: 0.05,
    ease: 'power2.out',
  });
};

// Modal entrance animation
export const animateModalEntrance = (overlay, content) => {
  const tl = gsap.timeline();

  tl.from(overlay, {
    opacity: 0,
    duration: 0.3,
    ease: 'power2.inOut',
  })
    .from(
      content,
      {
        opacity: 0,
        y: 50,
        scale: 0.9,
        duration: 0.4,
        ease: 'back.out',
      },
      '-=0.2'
    );

  return tl;
};

// Infinite scroll animation
export const animateInfiniteScroll = (element) => {
  gsap.to(element, {
    scrollLeft: element.scrollWidth,
    duration: 20,
    ease: 'none',
    repeat: -1,
  });
};

// Color change animation
export const animateColorChange = (element, colors) => {
  gsap.to(element, {
    backgroundColor: colors,
    duration: 2,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut',
  });
};
