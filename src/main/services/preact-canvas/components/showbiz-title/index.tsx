/**
 * Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { Component, h } from "preact";
import {
  animate as animateStyle,
  cell,
  cellInner,
  columnContainer,
  innerSquareColumn,
  innerSquareFlash,
  innerSquareItem,
  innerSquareOutline,
  innerSquareSizer,
  row,
  showbizTitle,
  showbizTitleFrame
} from "./style.css";

const title = "PR0XX";

function removeRandom<T>(arr: T[]): T {
  return arr.splice(Math.floor(Math.random() * arr.length), 1)[0];
}

function createNumberItems(): JSX.Element[] {
  const numbers = Array(8)
    .fill(null)
    .map((_, i) => i + 1);
  return Array(8)
    .fill(null)
    .map(() => (
      <div class={innerSquareSizer}>
        <div class={innerSquareItem}>{removeRandom(numbers)}</div>
      </div>
    ));
}

const columns = [...title].map(letter => (
  <div class={columnContainer}>
    <div class={innerSquareColumn}>
      <div class={innerSquareSizer}>
        <div class={innerSquareItem}>{letter}</div>
      </div>
      {createNumberItems()}
    </div>
  </div>
));

export interface Props {
  motion: boolean;
}

interface State {}

// tslint:disable-next-line:max-classes-per-file
export default class ShowbizTitle extends Component<Props, State> {
  shouldComponentUpdate(nextProps: Props) {
    return this.props.motion !== nextProps.motion;
  }

  componentDidMount() {
    // Random numbers -> PR0XX
    const oneIteration = 266;
    const untilFirstReveal = 2000;
    const untilNextReveal = 70;
    const middleInners = [...this.base!.querySelectorAll("." + cellInner)];
    let indexLeft = 2;
    let indexRight = 2;

    let time = untilFirstReveal;
    let flashHeight = 600;

    while (indexLeft >= 0) {
      for (const innerIndex of new Set([indexLeft, indexRight])) {
        const inner = middleInners[innerIndex];

        (inner.querySelector(
          "." + innerSquareColumn
        ) as HTMLElement).style.animationIterationCount =
          time / oneIteration + "";

        const flash = inner.querySelector(
          "." + innerSquareFlash
        ) as HTMLElement;

        flash.style.animationDelay = time + "ms";
        flash.style.height = flashHeight + "%";
      }
      indexLeft--;
      indexRight++;
      flashHeight /= 1.5;
      time += untilNextReveal;
    }

    // Circles
    time += 500;
    indexLeft = 2;
    indexRight = 2;

    while (indexLeft >= 0) {
      for (const index of new Set([indexLeft, indexRight])) {
        const inner = middleInners[index];
        (inner.querySelector(
          "." + innerSquareOutline
        ) as HTMLElement).style.animationDelay = time + "ms";
      }
      indexLeft--;
      indexRight++;
      time += 150;
    }
  }

  render({ motion }: Props, _s: State) {
    return (
      <div
        class={`${showbizTitle} ${motion ? animateStyle : ""}`}
        role="heading"
        aria-level="1"
        aria-label="PROXX"
      >
        <div class={showbizTitleFrame} aria-hidden="true">
          <div class={row}>
            {[...title].map((_, i) => (
              <div class={cell}>
                <div class={cellInner}>
                  {columns[i]}
                  <div class={innerSquareOutline} />
                  <div class={innerSquareFlash} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
}
