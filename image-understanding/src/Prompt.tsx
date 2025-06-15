/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
// Copyright 2024 Google LLC

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//     https://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Removed GoogleGenAI import - using secure backend proxy
import {useAtom} from 'jotai';
import getStroke from 'perfect-freehand';
import {useState} from 'react';
import {
  BoundingBoxMasksAtom,
  BoundingBoxes2DAtom,
  BoundingBoxes3DAtom,
  // CustomPromptsAtom, // Removed unused import
  DetectTypeAtom,
  HoverEnteredAtom,
  ImageSrcAtom,
  LinesAtom,
  PointsAtom,
  PromptsAtom,
  SelectedModelAtom,
  ShareStream,
  TemperatureAtom,
  VideoRefAtom,
} from './atoms';
import {lineOptions} from './consts';
import {getSvgPathFromStroke, loadImage} from './utils';

// No longer need to initialize AI client on frontend - using secure backend proxy
export function Prompt() {
  const [temperature, setTemperature] = useAtom(TemperatureAtom);
  const [, setBoundingBoxes2D] = useAtom(BoundingBoxes2DAtom);
  const [, setBoundingBoxes3D] = useAtom(BoundingBoxes3DAtom);
  const [, setBoundingBoxMasks] = useAtom(BoundingBoxMasksAtom);
  const [stream] = useAtom(ShareStream);
  const [detectType] = useAtom(DetectTypeAtom);
  const [, setPoints] = useAtom(PointsAtom);
  const [, setHoverEntered] = useAtom(HoverEnteredAtom);
  const [lines] = useAtom(LinesAtom);
  const [videoRef] = useAtom(VideoRefAtom);
  const [imageSrc] = useAtom(ImageSrcAtom);
// Removed unused showCustomPrompt state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetPrompt, setTargetPrompt] = useState('items');
  const [labelPrompt, setLabelPrompt] = useState('');
  const [showRawPrompt, setShowRawPrompt] = useState(false);
  const [selectedModel] = useAtom(SelectedModelAtom);

  const [prompts, setPrompts] = useAtom(PromptsAtom);
  // Removed unused customPrompts state

  const is2d = detectType === '2D bounding boxes';

  const get2dPrompt = () =>
    `Detect ${targetPrompt}, with no more than 20 items. Output a json list where each entry contains the 2D bounding box in "box_2d" and ${
      labelPrompt || 'a text label'
    } in "label".`;

  async function handleSend() {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      let activeDataURL;
      const maxSize = 640;
      const copyCanvas = document.createElement('canvas');
      const ctx = copyCanvas.getContext('2d')!;

      if (stream) {
        // screenshare
        const video = videoRef.current!;
        const scale = Math.min(
          maxSize / video.videoWidth,
          maxSize / video.videoHeight,
        );
        copyCanvas.width = video.videoWidth * scale;
        copyCanvas.height = video.videoHeight * scale;
        ctx.drawImage(
          video,
          0,
          0,
          video.videoWidth * scale,
          video.videoHeight * scale,
        );
      } else if (imageSrc) {
        const image = await loadImage(imageSrc);
        const scale = Math.min(maxSize / image.width, maxSize / image.height);
        copyCanvas.width = image.width * scale;
        copyCanvas.height = image.height * scale;
        console.log(copyCanvas);
        ctx.drawImage(image, 0, 0, image.width * scale, image.height * scale);
      }
      activeDataURL = copyCanvas.toDataURL('image/png');

      if (lines.length > 0) {
        for (const line of lines) {
          const p = new Path2D(
            getSvgPathFromStroke(
              getStroke(
                line[0].map(([x, y]) => [
                  x * copyCanvas.width,
                  y * copyCanvas.height,
                  0.5,
                ]),
                lineOptions,
              ),
            ),
          );
          ctx.fillStyle = line[1];
          ctx.fill(p);
        }
        activeDataURL = copyCanvas.toDataURL('image/png');
      }

      const prompt = prompts[detectType];
      const promptText = is2d ? get2dPrompt() : prompt.join(' ');

      setHoverEntered(false);
      
      // Prepare thinking config
      let thinkingConfig;
      if (selectedModel.modelId === 'models/gemini-2.5-flash-preview-04-17') {
        thinkingConfig = {thinkingBudget: 0};
      }

      // Call secure backend endpoint
      const apiResponse = await fetch('/api/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrl: activeDataURL,
          prompt: promptText,
          model: selectedModel.modelId,
          temperature: temperature,
          thinkingConfig: thinkingConfig,
        }),
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.error || `Request failed with status ${apiResponse.status}`);
      }

      const parsedResponse = await apiResponse.json();
      
      // Process the response based on detection type
      if (detectType === '2D bounding boxes') {
      const formattedBoxes = parsedResponse.map(
        (box: {box_2d: [number, number, number, number]; label: string}) => {
          const [ymin, xmin, ymax, xmax] = box.box_2d;
          return {
            x: xmin / 1000,
            y: ymin / 1000,
            width: (xmax - xmin) / 1000,
            height: (ymax - ymin) / 1000,
            label: box.label,
          };
        },
      );
      setHoverEntered(false);
      setBoundingBoxes2D(formattedBoxes);
    } else if (detectType === 'Points') {
      const formattedPoints = parsedResponse.map(
        (point: {point: [number, number]; label: string}) => {
          return {
            point: {
              x: point.point[1] / 1000,
              y: point.point[0] / 1000,
            },
            label: point.label,
          };
        },
      );
      setPoints(formattedPoints);
    } else if (detectType === 'Segmentation masks') {
      const formattedBoxes = parsedResponse.map(
        (box: {
          box_2d: [number, number, number, number];
          label: string;
          mask: ImageData;
        }) => {
          const [ymin, xmin, ymax, xmax] = box.box_2d;
          return {
            x: xmin / 1000,
            y: ymin / 1000,
            width: (xmax - xmin) / 1000,
            height: (ymax - ymin) / 1000,
            label: box.label,
            imageData: box.mask,
          };
        },
      );
      setHoverEntered(false);
      // sort largest to smallest
      const sortedBoxes = formattedBoxes.sort(
        (a: any, b: any) => b.width * b.height - a.width * a.height,
      );
      setBoundingBoxMasks(sortedBoxes);
    } else {
      const formattedBoxes = parsedResponse.map(
        (box: {
          box_3d: [
            number,
            number,
            number,
            number,
            number,
            number,
            number,
            number,
            number,
          ];
          label: string;
        }) => {
          const center = box.box_3d.slice(0, 3);
          const size = box.box_3d.slice(3, 6);
          const rpy = box.box_3d
            .slice(6)
            .map((x: number) => (x * Math.PI) / 180);
          return {
            center,
            size,
            rpy,
            label: box.label,
          };
        },
      );
      setBoundingBoxes3D(formattedBoxes);
    }
    } catch (error) {
      console.error('Failed to send prompt:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex grow flex-col gap-3">
      <div className="flex justify-between items-center">
        <div className="uppercase">
          Prompt: {selectedModel.displayName}
          {selectedModel.modelId === 'models/gemini-2.5-flash-preview-04-17'
            ? ' (no thinking)'
            : null}
        </div>
        <label className="flex gap-2 select-none">
          <input
            type="checkbox"
            checked={showRawPrompt}
            onChange={() => setShowRawPrompt(!showRawPrompt)}
          />
          <div>show raw prompt</div>
        </label>
      </div>
      <div className="w-full flex flex-col">
        {showRawPrompt ? (
          <div className="mb-2 text-[var(--text-color-secondary)]">
            {is2d
              ? get2dPrompt()
              : detectType === 'Segmentation masks'
                ? prompts[detectType].slice(0, 2).join(' ') +
                  prompts[detectType].slice(2).join('')
                : prompts[detectType].join(' ')}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div>{prompts[detectType][0]}:</div>
            <textarea
              className="w-full bg-[var(--input-color)] rounded-lg resize-none p-4"
              placeholder="What kind of things do you want to detect?"
              rows={1}
              value={is2d ? targetPrompt : prompts[detectType][1]}
              onChange={(e) => {
                if (is2d) {
                  setTargetPrompt(e.target.value);
                } else {
                  const value = e.target.value;
                  const newPrompts = {...prompts};
                  newPrompts[detectType][1] = value;
                  setPrompts(newPrompts);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            {is2d && (
              <>
                <div>Label each one with: (optional)</div>
                <textarea
                  className="w-full bg-[var(--input-color)] rounded-lg resize-none p-4"
                  rows={1}
                  placeholder="How do you want to label the things?"
                  value={labelPrompt}
                  onChange={(e) => setLabelPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
              </>
            )}
          </div>
        )}
      </div>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error: {error}
        </div>
      )}
      <div className="flex justify-between gap-3">
        <button
          className="bg-[#3B68FF] px-12 !text-white !border-none disabled:opacity-50"
          onClick={handleSend}
          disabled={isLoading}>
          {isLoading ? 'Processing...' : 'Send'}
        </button>
        <label className="flex items-center gap-2">
          temperature:
          <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
          />
          {temperature.toFixed(2)}
        </label>
      </div>
    </div>
  );
}
