import { Mastra } from '@mastra/core';
import { jobHunterAgent } from './agents/yc-hunter-agent';

export const mastra = new Mastra({
  agents: { jobHunterAgent },
});