import type { Page } from '@playwright/test';
export async function installAudioProbe(page:Page):Promise<void>{
  await page.addInitScript(() => {
    const connect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function(this: AudioNode, destination: AudioNode | AudioParam, ...args: number[]) {
      if (destination instanceof AudioDestinationNode) {
        const analyser = destination.context.createAnalyser(); analyser.fftSize = 2048;
        Reflect.apply(connect, this, [analyser]); Reflect.apply(connect, analyser, [destination]);
        const data = new Float32Array(analyser.fftSize);
        Object.assign(window, { outpostAudioRms: () => { analyser.getFloatTimeDomainData(data); return Math.sqrt(data.reduce((sum, v) => sum + v * v, 0) / data.length); } });
        return destination;
      }
      return Reflect.apply(connect, this, [destination, ...args]);
    } as typeof AudioNode.prototype.connect;
  });
}
