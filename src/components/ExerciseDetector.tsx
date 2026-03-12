import React, { useEffect, useRef, useState } from 'react';
import { Pose, Results } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { POSE_CONNECTIONS } from '@mediapipe/pose';
import { motion } from 'motion/react';
import { X, Trophy } from 'lucide-react';

interface ExerciseDetectorProps {
  type: 'pushups' | 'situps';
  onComplete: (reps: number) => void;
  onClose: () => void;
}

export const ExerciseDetector: React.FC<ExerciseDetectorProps> = ({ type, onComplete, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [count, setCount] = useState(0);
  const [status, setStatus] = useState<'down' | 'up'>('up');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    // Use a ref to store the current status to avoid re-running the effect
    const statusRef = { current: status };
    
    pose.onResults((results: Results) => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video || !results.image) return;
      
      const canvasCtx = canvas.getContext('2d');
      if (!canvasCtx) return;

      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      canvasCtx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

      if (results.poseLandmarks) {
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 4 });
        drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#FF0000', lineWidth: 2 });

        const landmarks = results.poseLandmarks;
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        const leftElbow = landmarks[13];
        const leftWrist = landmarks[15];
        const leftHip = landmarks[23];
        const leftKnee = landmarks[25];

        // Average shoulder height for more stability
        const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;

        if (type === 'pushups') {
          // Push-up logic: Shoulder goes down then up
          // We can also use the elbow angle if visible, but shoulder Y is more reliable for full body
          if (avgShoulderY > 0.75) { // Down position
            if (statusRef.current !== 'down') {
              statusRef.current = 'down';
              setStatus('down');
            }
          } else if (avgShoulderY < 0.55 && statusRef.current === 'down') { // Up position
            statusRef.current = 'up';
            setStatus('up');
            setCount(prev => prev + 1);
          }
        } else {
          // Sit-up logic: Distance between shoulder and knee
          const dist = Math.sqrt(
            Math.pow(leftShoulder.x - leftKnee.x, 2) + 
            Math.pow(leftShoulder.y - leftKnee.y, 2)
          );
          
          // Using a more sensitive threshold for sit-ups
          if (dist < 0.25) { // Crunch/Up position for sit-up
            if (statusRef.current !== 'down') {
              statusRef.current = 'down';
              setStatus('down');
            }
          } else if (dist > 0.45 && statusRef.current === 'down') { // Back/Down position for sit-up
            statusRef.current = 'up';
            setStatus('up');
            setCount(prev => prev + 1);
          }
        }
      }
      canvasCtx.restore();
    });

    let isClosed = false;
    let camera: Camera | null = null;

    if (videoRef.current) {
      camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (!isClosed && videoRef.current) {
            try {
              await pose.send({ image: videoRef.current });
            } catch (err) {
              console.error("Pose send error:", err);
            }
          }
        },
        width: 640,
        height: 480,
      });
      camera.start().then(() => {
        if (!isClosed) setIsReady(true);
      }).catch(err => console.error("Camera start error:", err));
    }

    return () => {
      isClosed = true;
      if (camera) {
        camera.stop();
      }
      pose.close();
    };
  }, [type]); // Only re-run if type changes

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
      <div className="absolute top-4 right-4 z-10">
        <button onClick={onClose} className="p-2 bg-white/20 rounded-full text-white">
          <X size={24} />
        </button>
      </div>

      <div className="relative w-full max-w-md aspect-[3/4] bg-zinc-900 overflow-hidden rounded-2xl">
        <video ref={videoRef} className="hidden" width={640} height={480} />
        <canvas ref={canvasRef} className="w-full h-full object-cover" width={640} height={480} />
        
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}

        <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center">
          <div className="bg-white/90 backdrop-blur px-6 py-3 rounded-2xl shadow-xl flex items-center gap-4">
            <div className="text-center">
              <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">{type}</p>
              <p className="text-4xl font-black text-zinc-900">{count}</p>
            </div>
            <div className="h-10 w-[1px] bg-zinc-200" />
            <div className="text-center">
              <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Minutes</p>
              <p className="text-4xl font-black text-blue-600">{type === 'pushups' ? count : Math.floor(count / 2)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 px-6 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Keep going!</h2>
        <p className="text-zinc-400">
          {type === 'pushups' ? '1 Push-up = 1 Minute' : '2 Sit-ups = 1 Minute'}
        </p>
        <button 
          onClick={() => onComplete(type === 'pushups' ? count : Math.floor(count / 2))}
          className="mt-6 w-full bg-blue-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2"
        >
          <Trophy size={20} />
          Finish & Claim Minutes
        </button>
      </div>
    </div>
  );
};
