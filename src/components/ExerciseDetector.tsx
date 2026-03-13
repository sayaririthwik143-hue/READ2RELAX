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
  const [feedback, setFeedback] = useState<string>('Get ready!');
  const [isReady, setIsReady] = useState(false);

  // Helper to calculate angle between three points
  const calculateAngle = (a: any, b: any, c: any) => {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
  };

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
    const stateRef = { 
      status: status,
      lastAngle: 0,
      formValid: true
    };
    
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
        
        // Key landmarks
        const lShoulder = landmarks[11];
        const lElbow = landmarks[13];
        const lWrist = landmarks[15];
        const lHip = landmarks[23];
        const lKnee = landmarks[25];
        const lAnkle = landmarks[27];

        if (type === 'pushups') {
          // Push-up logic using elbow angle and body alignment
          const elbowAngle = calculateAngle(lShoulder, lElbow, lWrist);
          const hipAngle = calculateAngle(lShoulder, lHip, lKnee);
          
          // Form validation: Back should be relatively straight
          const isBackStraight = hipAngle > 150;
          
          if (!isBackStraight) {
            setFeedback('Keep your back straight!');
            stateRef.formValid = false;
          } else {
            stateRef.formValid = true;
            
            if (elbowAngle < 90) { // Down position
              if (stateRef.status !== 'down') {
                stateRef.status = 'down';
                setStatus('down');
                setFeedback('Now push up!');
              }
            } else if (elbowAngle > 160 && stateRef.status === 'down') { // Up position
              stateRef.status = 'up';
              setStatus('up');
              setCount(prev => prev + 1);
              setFeedback('Great rep! Go down again.');
            } else if (stateRef.status === 'up') {
              setFeedback('Lower your chest...');
            }
          }
        } else {
          // Sit-up logic using hip angle and knee position
          const hipAngle = calculateAngle(lShoulder, lHip, lKnee);
          const kneeAngle = calculateAngle(lHip, lKnee, lAnkle);
          
          // Form validation: Knees should be bent
          const areKneesBent = kneeAngle < 130;
          
          if (!areKneesBent) {
            setFeedback('Bend your knees!');
            stateRef.formValid = false;
          } else {
            stateRef.formValid = true;

            if (hipAngle < 60) { // Up/Crunch position
              if (stateRef.status !== 'up') {
                stateRef.status = 'up';
                setStatus('up');
                setFeedback('Now go back down.');
              }
            } else if (hipAngle > 130 && stateRef.status === 'up') { // Down/Lying position
              stateRef.status = 'down';
              setStatus('down');
              setCount(prev => prev + 1);
              setFeedback('Good! Crunch up again.');
            } else if (stateRef.status === 'down') {
              setFeedback('Crunch up!');
            }
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

        <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-4">
          {/* Feedback Message */}
          <motion.div 
            key={feedback}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg"
          >
            {feedback}
          </motion.div>

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
