import Phaser from 'phaser';
import { FlightScene } from './render/FlightScene';
import './style.css';
import './ui/instrumentPanel.css';
import './ui/theme.css';
import './ui/flight/flight.css';
import './ui/build/build.css';
import './ui/base/base.css';
import './ui/map/map.css';
import './ui/ship/ship.css';
import './ui/dialogs/dialogs.css';
import './ui/console.css';

new Phaser.Game({ type: Phaser.AUTO, parent: 'game', backgroundColor: '#080f1c',
  // The simulation owns time clamping and catch-up; Phaser smoothing can discard time at low rendering rates.
  fps: { smoothStep: false },
  audio: { noAudio: true }, // The procedural Web Audio mixer owns the audio context.
  antialias: true, scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  scene: [FlightScene], banner: false });
