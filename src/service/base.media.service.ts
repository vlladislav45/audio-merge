import path from "path";
import {Clip} from "../model/media";

export abstract class BaseMediaService {
  public abstract prepareCliCommand(outputName: string): string;

  /**
   * Extract source file paths from the input
   */
  inputs(input: Clip[]): string {
    const src = input
        .map(({ src }) => src)
        .join(' -i ')
        .trim()
        .toString();

    return src;
  }

  /**
   * Convert an input file names into output ones
   */
  generateOutputName(index: number, name: string): string {
    return `output--${index}-${path.basename(name)}`;
  }
}