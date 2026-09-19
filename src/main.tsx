import { render } from 'preact';
import { Revue } from './Revue';
import './ui/fonts.css';
import './ui/tokens.css';

const racine = document.getElementById('racine');
if (!racine) throw new Error('#racine introuvable');
render(<Revue />, racine);
