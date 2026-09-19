import { render } from 'preact';
import { Shell } from './app/Shell';
import './ui/fonts.css';
import './ui/tokens.css';

const racine = document.getElementById('racine');
if (!racine) throw new Error('#racine introuvable');
render(<Shell />, racine);
