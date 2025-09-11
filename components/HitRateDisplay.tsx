"use client";
import React, { useState, useEffect } from 'react';
import { pingTracker, HitRateStats } from '../lib/ping-tracker';

interface HitRateDisplayProps {
  className?: string;
}

const HitRateDisplay: React.FC<HitRateDisplayProps> = ({ className = '' }) => {
  const [stats, setStats] = useState<HitRateStats | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [sessionOnly, setSessionOnly] = useState(true);

  const updateStats = () => {
    const stats = pingTracker.getHitRateStats(sessionOnly);
    setStats(stats);
  };  useEffect(() => {
    updateStats();
    
    // Listen for storage changes to update stats when feedback is recorded
    const handleStorageChange = () => updateStats();
    window.addEventListener('storage', handleStorageChange);
    
    // Poll for updates (in case localStorage doesn't trigger events in same tab)
    const interval = setInterval(updateStats, 2000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [sessionOnly]);

  if (!stats || stats.total === 0) {
    return (
      <div className={`hit-rate-display empty ${className}`}>
        <span className="hit-rate-label">🎯 Accuracy Tracking</span>
        <span className="hit-rate-value">No feedback yet</span>
        
        <style jsx>{`
          .hit-rate-display {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 10px;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 6px;
            font-size: 11px;
            color: #9ca3af;
            font-family: 'Inter', sans-serif;
          }
          
          .hit-rate-label {
            font-weight: 500;
          }
          
          .hit-rate-value {
            font-weight: 300;
            opacity: 0.7;
          }
        `}</style>
      </div>
    );
  }

  const getAccuracyColor = (rate: number) => {
    if (rate >= 75) return '#22c55e';
    if (rate >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const getClarityColor = (rate: number) => {
    if (rate >= 80) return '#22c55e';
    if (rate >= 60) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className={`hit-rate-display ${className}`}>
      <div className="hit-rate-main" onClick={() => setShowDetails(!showDetails)}>
        <span className="hit-rate-label">🎯 Accuracy</span>
        <span 
          className="hit-rate-value accuracy" 
          style={{ color: getAccuracyColor(stats.accuracyRate) }}
        >
          {stats.accuracyRate.toFixed(1)}%
        </span>
        <span className="hit-rate-count">({stats.total})</span>
        <span className="toggle-icon">{showDetails ? '▼' : '▶'}</span>
      </div>

      {showDetails && (
        <div className="hit-rate-details">
          <div className="stats-row">
            <div className="scope-toggle">
              <button 
                className={sessionOnly ? 'active' : ''}
                onClick={() => setSessionOnly(true)}
              >
                This Session
              </button>
              <button 
                className={!sessionOnly ? 'active' : ''}
                onClick={() => setSessionOnly(false)}
              >
                All Time
              </button>
            </div>
          </div>
          
          <div className="stats-row">
            <span className="stat-label">Clarity Rate:</span>
            <span 
              className="stat-value"
              style={{ color: getClarityColor(stats.clarityRate) }}
            >
              {stats.clarityRate.toFixed(1)}%
            </span>
          </div>
          
          <div className="stats-breakdown">
            <div className="breakdown-item yes">
              <span className="breakdown-icon">✓</span>
              <span className="breakdown-label">Yes</span>
              <span className="breakdown-count">{stats.breakdown.yes}</span>
            </div>
            <div className="breakdown-item maybe">
              <span className="breakdown-icon">~</span>
              <span className="breakdown-label">Maybe</span>
              <span className="breakdown-count">{stats.breakdown.maybe}</span>
            </div>
            <div className="breakdown-item no">
              <span className="breakdown-icon">✗</span>
              <span className="breakdown-label">No</span>
              <span className="breakdown-count">{stats.breakdown.no}</span>
            </div>
            <div className="breakdown-item unclear">
              <span className="breakdown-icon">?</span>
              <span className="breakdown-label">Unclear</span>
              <span className="breakdown-count">{stats.breakdown.unclear}</span>
            </div>
          </div>
          
          {Object.keys(stats.byCheckpointType).length > 0 && (
            <div className="checkpoint-breakdown">
              <div className="breakdown-header">By Checkpoint Type:</div>
              {Object.entries(stats.byCheckpointType).map(([type, typeStats]) => (
                <div key={type} className="checkpoint-item">
                  <span className="checkpoint-type">{type}:</span>
                  <span className="checkpoint-accuracy" style={{ color: getAccuracyColor(typeStats.accuracyRate) }}>
                    {typeStats.accuracyRate.toFixed(1)}%
                  </span>
                  <span className="checkpoint-count">({typeStats.total})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .hit-rate-display {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          font-family: 'Inter', sans-serif;
          overflow: hidden;
        }

        .hit-rate-main {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .hit-rate-main:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .hit-rate-label {
          font-size: 11px;
          font-weight: 500;
          color: #e5e7eb;
        }

        .hit-rate-value.accuracy {
          font-size: 12px;
          font-weight: 600;
        }

        .hit-rate-count {
          font-size: 10px;
          color: #9ca3af;
          font-weight: 300;
        }

        .toggle-icon {
          margin-left: auto;
          font-size: 10px;
          color: #6b7280;
        }

        .hit-rate-details {
          padding: 8px 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.2);
        }

        .stats-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          font-size: 10px;
        }

        .stats-row:last-child {
          margin-bottom: 0;
        }

        .scope-toggle {
          display: flex;
          gap: 4px;
        }

        .scope-toggle button {
          padding: 3px 6px;
          font-size: 9px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          color: #9ca3af;
          border-radius: 3px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .scope-toggle button.active {
          background: #3b82f6;
          border-color: #3b82f6;
          color: white;
        }

        .stat-label {
          color: #d1d5db;
        }

        .stat-value {
          font-weight: 600;
        }

        .stats-breakdown {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
          margin-top: 8px;
        }

        .breakdown-item {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 3px 6px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.03);
          font-size: 9px;
        }

        .breakdown-item.yes .breakdown-icon { color: #22c55e; }
        .breakdown-item.maybe .breakdown-icon { color: #f59e0b; }
        .breakdown-item.no .breakdown-icon { color: #ef4444; }
        .breakdown-item.unclear .breakdown-icon { color: #8b5cf6; }

        .breakdown-icon {
          font-weight: bold;
          font-size: 10px;
        }

        .breakdown-label {
          color: #d1d5db;
          flex: 1;
        }

        .breakdown-count {
          color: #9ca3af;
          font-weight: 500;
        }

        .checkpoint-breakdown {
          margin-top: 12px;
          padding-top: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .breakdown-header {
          font-size: 9px;
          color: #d1d5db;
          font-weight: 500;
          margin-bottom: 6px;
        }

        .checkpoint-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 2px 0;
          font-size: 9px;
        }

        .checkpoint-type {
          color: #9ca3af;
          text-transform: capitalize;
          min-width: 40px;
        }

        .checkpoint-accuracy {
          font-weight: 600;
          min-width: 35px;
        }

        .checkpoint-count {
          color: #6b7280;
          font-size: 8px;
        }
      `}</style>
    </div>
  );
};

export default HitRateDisplay;
