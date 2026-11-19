import { createStage, makeFilm, boot } from './kit.js';
import { buildStory } from './story.js';
import B from './beats.json';

const stage = createStage({ video: { width: 1920, height: 1080, fps: B.fps, duration: B.duration }, exposure: 1.0 });
const story = buildStory(stage, B);
const film = makeFilm(stage, story);
boot(film, stage, story);
