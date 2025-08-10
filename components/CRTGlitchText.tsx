import React, { useRef, useEffect, useState } from 'react';

interface CRTGlitchTextProps {
  className?: string;
  onTapTrigger?: boolean;
  children?: React.ReactNode;
  onClick?: () => void;
}

export const CRTGlitchText: React.FC<CRTGlitchTextProps> = ({ 
  className = '', 
  onTapTrigger: _,
  children,
  onClick
}) => {
  const textRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const lastAutoGlitchRef = useRef<number>(0);
  const [isIOS, setIsIOS] = useState(false);
  
  useEffect(() => {
    // iOS 감지
    const checkIOS = () => {
      const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      setIsIOS(isIOSDevice);
    };
    checkIOS();
  }, []);


  useEffect(() => {
    const animate = (currentTime: number) => {
      if (!textRef.current) return;

      const globalTime = currentTime * 0.001;
      
      // Initialize lastAutoGlitchRef if not set
      if (lastAutoGlitchRef.current === 0) {
        lastAutoGlitchRef.current = currentTime;
      }
      
      // 다단계 사이클: 정지(3초) → 전조증상(1.5초) → 서서히강화(0.5초) → 강한효과(1.5초) → 4단계 복원(4.5초) → 반복
      const totalCycle = 11000; // 총 11초 사이클
      const timeSinceLastGlitch = currentTime - lastAutoGlitchRef.current;
      // const firstGlitchDelay = 3000; // 첫 글리치까지 3초
      
      // 전조증상과 강한효과를 하나의 연속적인 흐름으로 처리
      let globalIntensity = 0;
      // let isInTransition = false;
      
      if (timeSinceLastGlitch > 3000) {
        const effectTime = timeSinceLastGlitch - 3000; // 3초 후부터 효과 시작
        
        if (effectTime < 8000) { // 총 8초간 연속적인 효과 (전조→강화→최대→다단계복원)
          if (effectTime < 1500) {
            // 1.5초간 전조증상 (0 → 30%)
            globalIntensity = (effectTime / 1500) * 0.3;
            // isInTransition = true;
          } else if (effectTime < 2000) {
            // 0.5초간 서서히 강화 (30% → 100%)
            const rampTime = effectTime - 1500;
            globalIntensity = 0.3 + (rampTime / 500) * 0.7;
            // isInTransition = true;
          } else if (effectTime < 3500) {
            // 1.5초간 강한 효과 유지 (100%)
            globalIntensity = 1.0;
            // isInTransition = true;
          } else if (effectTime < 4500) {
            // 1초간: 강한 효과 → 중간 효과로 점진적 감소 (100% → 50%)
            const fadeTime = effectTime - 3500;
            const fadeProgress = fadeTime / 1000;
            // 사인 곡선으로 부드럽게 감소
            globalIntensity = 1.0 - (Math.sin(fadeProgress * Math.PI * 0.5) * 0.5);
            // isInTransition = true;
          } else if (effectTime < 5500) {
            // 1초간: 중간 효과 → 약한 효과로 (50% → 20%)
            const midFadeTime = effectTime - 4500;
            const midFadeProgress = midFadeTime / 1000;
            globalIntensity = 0.5 - (midFadeProgress * 0.3);
            // isInTransition = true;
          } else if (effectTime < 7000) {
            // 1.5초간: 약한 효과 → 거의 없음 (20% → 5%)
            const weakFadeTime = effectTime - 5500;
            const weakFadeProgress = weakFadeTime / 1500;
            globalIntensity = 0.2 - (weakFadeProgress * 0.15);
            // isInTransition = true;
          } else if (effectTime < 8000) {
            // 1초간: 마지막 미세한 잔향 (5% → 0%)
            const finalFadeTime = effectTime - 7000;
            const finalFadeProgress = finalFadeTime / 1000;
            globalIntensity = 0.05 * (1 - finalFadeProgress);
            // isInTransition = true;
          }
        }
      }
      
      // 사이클 리셋
      if (timeSinceLastGlitch > totalCycle) {
        lastAutoGlitchRef.current = currentTime;
      }
      
      // 연속적인 4단계 시스템: 정지 → 전조 → 강화 → 최대효과 → 복원
      let transform, filter;
      
      if (globalIntensity === 0) {
        // 1단계: 완전 정지 상태
        transform = `translate(0px, 0px)`;
        filter = `
          contrast(1.05) 
          saturate(1.1) 
          drop-shadow(0 0 2px rgba(255, 255, 255, 0.2))
        `;
      } else if (globalIntensity < 0.95) {
        // 2-3단계: 전조증상 → 서서히 강화 + 복원 중간단계 (0% → 95%)
        const shakeMultiplier = globalIntensity < 0.3 ? 2.0 : 2.0 + (globalIntensity - 0.3) * 5.0; // 30% 이후 급격히 증가
        const freqMultiplier = 1.0 + globalIntensity * 3.0;
        
        const electricCrackle1 = Math.sin(globalTime * (20.0 * freqMultiplier)) * (1.2 * globalIntensity);
        const electricCrackle2 = Math.cos(globalTime * (25.0 * freqMultiplier)) * (1.0 * globalIntensity);
        const electricCrackle3 = Math.sin(globalTime * (30.0 * freqMultiplier) + 1.0) * (0.8 * globalIntensity);
        const electricCrackle4 = Math.cos(globalTime * (35.0 * freqMultiplier) + 2.0) * (0.6 * globalIntensity);
        
        // 점진적 흔들림 (30% 이후 위아래 강조) - 살짝 증가
        const shakeX = Math.sin(globalTime * (40.0 * freqMultiplier)) * globalIntensity * 4.0;
        const shakeY = Math.cos(globalTime * (35.0 * freqMultiplier)) * globalIntensity * (shakeMultiplier * 1.2);
        
        // 전조증상에도 색수차 효과 추가
        const chromaticAberration = globalIntensity * 3; // 30%일 때 0.9, 70%일 때 2.1
        
        transform = `translate(${shakeX}px, ${shakeY}px)`;
        // iOS에서는 drop-shadow 개수를 줄임
        if (isIOS) {
          filter = `
            contrast(${1.05 + globalIntensity * 0.4}) 
            saturate(${1.1 + globalIntensity * 0.6}) 
            drop-shadow(${chromaticAberration}px 0 0 rgba(255, 0, 0, ${globalIntensity * 0.3}))
            drop-shadow(${-chromaticAberration}px 0 0 rgba(0, 255, 255, ${globalIntensity * 0.3}))
            drop-shadow(0 0 ${2 + globalIntensity * 10}px rgba(255, 255, 255, ${0.2 + globalIntensity * 0.6}))
          `;
        } else {
          filter = `
            contrast(${1.05 + globalIntensity * 0.4}) 
            saturate(${1.1 + globalIntensity * 0.6}) 
            drop-shadow(${chromaticAberration}px 0 0 rgba(255, 0, 0, ${globalIntensity * 0.3}))
            drop-shadow(${-chromaticAberration}px 0 0 rgba(0, 255, 255, ${globalIntensity * 0.3}))
            drop-shadow(${electricCrackle1}px ${electricCrackle2}px 0 rgba(255, 255, 255, ${0.2 + globalIntensity * 0.6}))
            drop-shadow(${electricCrackle3}px ${-electricCrackle1}px 0 rgba(100, 200, 255, ${globalIntensity * 0.5}))
            drop-shadow(${electricCrackle4}px ${electricCrackle2 * 0.5}px 0 rgba(255, 150, 255, ${globalIntensity * 0.4}))
            drop-shadow(0 0 ${2 + globalIntensity * 10}px rgba(255, 255, 255, ${0.2 + globalIntensity * 0.6}))
          `;
        }
      } else {
        // 4단계: 최대 강도 효과 (95% → 100%) - 강력한 파지지직 효과
        const intensity = globalIntensity;
        const glitchFreq = 15.0 + intensity * 10.0;
          
        // 전기적 노이즈 기반 변형 - 위아래 강조 (살짝 증가)
        // 복원 중에는 랜덤 효과를 줄여서 부드럽게
        const randomReduction = intensity < 1.0 ? intensity : 1.0;
        const electricCrackleX = (Math.random() - 0.5) * intensity * 8 * randomReduction;
        const electricCrackleY = (Math.random() - 0.5) * intensity * 18 * randomReduction;
        const electricScale = 1 + (Math.random() - 0.5) * intensity * 0.15;
        const electricSkew = (Math.random() - 0.5) * intensity * 3;
        
        // RGB 채널 분리 (크로매틱 수차) - 강화
        const rgbSeparation = intensity * 12;
        
        // 물리적 찌그러짐 - 파지지직 변형
        const lightningSquashX = 1 - intensity * Math.sin(globalTime * glitchFreq) * 0.12;
        const lightningStretchY = 1 + intensity * Math.cos(globalTime * glitchFreq * 0.7) * 0.08;
          
        // 파지지직 웨이브 - 위아래 강하고 좌우는 적당히
        const verticalWavePhase1 = globalTime * 20.0 + intensity * 6.0;
        const verticalWavePhase2 = globalTime * 18.0 - intensity * 4.0;
        const horizontalWavePhase1 = globalTime * 12.0 + intensity * 3.0;
        const horizontalWavePhase2 = globalTime * 14.0 - intensity * 2.0;
        
        // 위아래로 강한 파지지직 파동 - 위아래 강조 (살짝 증가)
        const verticalWave1 = Math.sin(verticalWavePhase1) * intensity * 12;
        const verticalWave2 = Math.cos(verticalWavePhase2) * intensity * 10;
        // 좌우로는 적당한 파동 (살짝 증가)
        const horizontalWave1 = Math.sin(horizontalWavePhase1) * intensity * 4;
        const horizontalWave2 = Math.cos(horizontalWavePhase2) * intensity * 3;
        
        // 전기적 리플 웨이브 (적당한 강도)
        const electricRipplePhase = globalTime * 8.0 - intensity * 6.0;
        const electricRippleWave = Math.sin(electricRipplePhase) * intensity * 5;
        
        // 강력한 전기 스파크 효과 (극적인 수축과 팽창)
        const electricSparkProgress = (Math.sin(globalTime * 4.0) + Math.sin(globalTime * 3.2)) > 1.7 ? 
          ((Math.sin(globalTime * 4.0) + Math.sin(globalTime * 3.2)) - 1.7) / 0.3 : 0;
        // const electricSparkDistortion = electricSparkProgress * intensity * 25;
          
        // 전기적 스파이크 - 위아래 강조 (복원 중에는 확률 감소)
        const spikeChance = intensity < 1.0 ? intensity * intensity : 1.0; // 제곱으로 더 빠르게 감소
        const electricSpikeX = Math.random() < (0.05 * spikeChance) ? (Math.random() - 0.5) * 4 * intensity : 0;
        const electricSpikeY = Math.random() < (0.15 * spikeChance) ? (Math.random() - 0.5) * 12 * intensity : 0;
        
        // 복합 웨이브 변형 - 위아래 더욱 강조
        const totalWaveDistortionX = horizontalWave1 + horizontalWave2 + electricRippleWave * 0.1;
        const totalWaveDistortionY = verticalWave1 + verticalWave2 + electricRippleWave * 1.2;
        
        transform = `
          translate(${electricCrackleX + electricSpikeX + totalWaveDistortionX}px, ${electricCrackleY + electricSpikeY + totalWaveDistortionY}px)
          scale(${lightningSquashX * electricScale * (1 + electricSparkProgress * 0.2)}, ${lightningStretchY * (1 + electricSparkProgress * 0.15)})
          skew(${electricSkew + horizontalWave1 * 0.05}deg, ${(Math.random() - 0.5) * intensity * 3 + verticalWave1 * 0.1}deg)
        `;
        
        // iOS에서는 효과를 단순화
        if (isIOS) {
          filter = `
            contrast(${1.25 + intensity * 0.6})
            saturate(${1.4 + intensity * 0.5})
            brightness(${1.1 + intensity * 0.2})
            drop-shadow(${rgbSeparation * 0.6}px 0 0 red)
            drop-shadow(${-rgbSeparation * 0.6}px 0 0 cyan)
            drop-shadow(0 0 ${intensity * 10}px rgba(255, 255, 255, ${intensity * 0.7}))
          `;
        } else {
          filter = `
            contrast(${1.25 + intensity * 0.6})
            saturate(${1.4 + intensity * 0.5})
            brightness(${1.1 + intensity * 0.2})
            hue-rotate(${Math.sin(globalTime * 3.0) * intensity * 15}deg)
            drop-shadow(${rgbSeparation * 0.6}px 0 0 red)
            drop-shadow(${-rgbSeparation * 0.6}px 0 0 cyan)
            drop-shadow(${rgbSeparation * 0.3}px ${rgbSeparation * 0.2}px 0 rgba(255, 0, 0, ${intensity * 0.4}))
            drop-shadow(${-rgbSeparation * 0.3}px ${-rgbSeparation * 0.2}px 0 rgba(0, 255, 255, ${intensity * 0.4}))
            drop-shadow(${horizontalWave1 * 0.7}px ${verticalWave1 * 0.7}px 0 rgba(255, 255, 255, ${intensity * 0.6}))
            drop-shadow(${horizontalWave2 * 0.7}px ${verticalWave2 * 0.7}px 0 rgba(100, 200, 255, ${intensity * 0.5}))
            drop-shadow(0 0 ${intensity * 10}px rgba(255, 255, 255, ${intensity * 0.7}))
            blur(${intensity * 0.1}px)
          `;
        }
      }

      // 변환 적용
      textRef.current.style.transform = transform;
      textRef.current.style.filter = filter;

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isIOS]); // isIOS 의존성 추가

  return (
    <span className="relative inline-block">
      {/* 메인 텍스트 */}
      <span 
        ref={textRef}
        className={`${className} transition-none ${isIOS ? '' : 'will-change-transform'} relative z-10 inline-block`}
        onClick={onClick}
        style={{
          transformOrigin: 'center center',
          textShadow: '0 0 3px rgba(255, 255, 255, 0.3)',
          letterSpacing: '0.02em',
          // iOS에서 GPU 가속 최적화
          ...(isIOS ? { 
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
            perspective: 1000
          } : {})
        }}
      >
        {children}
      </span>
      
      
      
      <style jsx>{`
        @keyframes crt-flicker {
          0% { opacity: 1; }
          95% { opacity: 1; }
          96% { opacity: 0.98; }
          97% { opacity: 1; }
          98% { opacity: 0.99; }
          100% { opacity: 1; }
        }
        
      `}</style>
    </span>
  );
};