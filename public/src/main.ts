import './style.css';
import { navigate } from './router';

window.addEventListener('DOMContentLoaded', () => {
  navigate();
});

window.addEventListener('hashchange', () => {
  navigate();
});
