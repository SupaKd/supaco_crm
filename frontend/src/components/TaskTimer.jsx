import { useState, useEffect } from 'react';
import { Play, Pause, Clock } from 'lucide-react';
import { timeTrackingAPI } from '../services/api';
import './TaskTimer.scss';

const TaskTimer = ({ taskId, onTimeUpdate }) => {
  const [activeTimer, setActiveTimer] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadActiveTimer();
  }, [taskId]);

  useEffect(() => {
    let interval = null;

    if (activeTimer) {
      // Calculer le temps écoulé depuis le début
      const startTime = new Date(activeTimer.started_at).getTime();

      interval = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        setElapsedSeconds(elapsed);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTimer]);

  const loadActiveTimer = async () => {
    try {
      const response = await timeTrackingAPI.getActive(taskId);
      setActiveTimer(response.data.data);

      if (response.data.data) {
        // Calculer le temps initial
        const startTime = new Date(response.data.data.started_at).getTime();
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setElapsedSeconds(elapsed);
      }
    } catch (error) {
      console.error('Erreur chargement timer:', error);
    }
  };

  const handleStart = async () => {
    setIsLoading(true);
    try {
      await timeTrackingAPI.start(taskId);
      await loadActiveTimer();
      if (onTimeUpdate) onTimeUpdate();
    } catch (error) {
      console.error('Erreur démarrage timer:', error);
      alert(error.response?.data?.message || 'Erreur lors du démarrage du timer');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    if (!activeTimer) return;

    setIsLoading(true);
    try {
      await timeTrackingAPI.stop(activeTimer.id);
      setActiveTimer(null);
      setElapsedSeconds(0);
      if (onTimeUpdate) onTimeUpdate();
    } catch (error) {
      console.error('Erreur arrêt timer:', error);
      alert(error.response?.data?.message || 'Erreur lors de l\'arrêt du timer');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
    }
    return `${minutes}m ${secs.toString().padStart(2, '0')}s`;
  };

  return (
    <div className={`task-timer ${activeTimer ? 'active' : ''}`}>
      <div className="timer-display">
        <Clock size={16} />
        <span className="timer-value">
          {activeTimer ? formatTime(elapsedSeconds) : '0m 00s'}
        </span>
      </div>

      <button
        className={`timer-btn ${activeTimer ? 'stop' : 'start'}`}
        onClick={activeTimer ? handleStop : handleStart}
        disabled={isLoading}
        title={activeTimer ? 'Arrêter le timer' : 'Démarrer le timer'}
      >
        {isLoading ? (
          <div className="spinner-small" />
        ) : activeTimer ? (
          <Pause size={16} />
        ) : (
          <Play size={16} />
        )}
      </button>
    </div>
  );
};

export default TaskTimer;
