import Phaser from 'phaser';
import { FlightScene } from './render/FlightScene';
import './style.css';

new Phaser.Game({ type: Phaser.AUTO, parent: 'game', backgroundColor: '#080f1c',
  antialias: true, scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  scene: [FlightScene], banner: false });
