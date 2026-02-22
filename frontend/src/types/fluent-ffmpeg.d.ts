declare module 'fluent-ffmpeg' {
  interface FfmpegCommand {
    outputOptions(options: string[]): this;
    output(output: string): this;
    on(event: string, callback: (...args: any[]) => void): this;
    run(): this;
  }

  function ffmpeg(input?: string | NodeJS.ReadableStream): FfmpegCommand;

  namespace ffmpeg {
    function setFfmpegPath(path: string): void;
    function setFfprobePath(path: string): void;
  }

  export = ffmpeg;
}
