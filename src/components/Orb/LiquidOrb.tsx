'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BASE_EDGE_GLOW,
  BASE_EXPOSURE,
  ORB_SHADER_URL,
  ORB_UNIFORM_BYTES,
  REDUCED_MOTION_TIME,
  U_EDGE_GLOW,
  U_EXPOSURE,
  U_SIZE_X,
  U_SIZE_Y,
  U_TIME,
  createOrbUniformData,
} from '@/lib/orb-uniforms';

type OrbState = 'booting' | 'running' | 'unsupported';

interface LiquidOrbProps {
  /** 0 = calm idle, 1 = fully excited. Drives exposure + edge glow. */
  excitement?: number;
  className?: string;
}

/**
 * WebGPU "Glass Liquid" orb.
 *
 * Renders a fullscreen triangle through public/shaders/liquid-orb.wgsl and
 * composites with premultiplied alpha, so everything outside the ball is
 * genuinely transparent and the page background shows through.
 *
 * Falls back to a pure-CSS aurora blob when WebGPU is missing (Safari < 26,
 * Firefox, most mobile browsers) or when device init fails for any reason.
 */
export const LiquidOrb: React.FC<LiquidOrbProps> = ({ excitement = 0, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [state, setState] = useState<OrbState>('booting');

  // Live values the render loop reads without re-running the WebGPU effect.
  const excitementRef = useRef(excitement);
  const smoothedRef = useRef(0);

  useEffect(() => {
    excitementRef.current = excitement;
  }, [excitement]);

  const handleFailure = useCallback((reason: string, err?: unknown) => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[LiquidOrb] falling back to CSS orb: ${reason}`, err ?? '');
    }
    setState('unsupported');
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let frame = 0;
    let device: GPUDevice | null = null;
    let context: GPUCanvasContext | null = null;
    let observer: ResizeObserver | null = null;

    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const stop = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      observer?.disconnect();
      observer = null;
      try {
        context?.unconfigure();
      } catch {
        /* context already gone */
      }
      context = null;
      device?.destroy();
      device = null;
    };

    const boot = async () => {
      const gpu = (navigator as Navigator & { gpu?: GPU }).gpu;
      if (!gpu) {
        handleFailure('navigator.gpu is unavailable');
        return;
      }

      let shaderSource: string;
      try {
        const res = await fetch(ORB_SHADER_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        shaderSource = await res.text();
      } catch (err) {
        handleFailure('shader fetch failed', err);
        return;
      }
      if (disposed) return;

      let adapter: GPUAdapter | null = null;
      try {
        adapter = await gpu.requestAdapter({ powerPreference: 'high-performance' });
      } catch (err) {
        handleFailure('requestAdapter threw', err);
        return;
      }
      if (!adapter) {
        handleFailure('no GPU adapter');
        return;
      }
      if (disposed) return;

      try {
        device = await adapter.requestDevice();
      } catch (err) {
        handleFailure('requestDevice failed', err);
        return;
      }
      if (disposed || !device) {
        device?.destroy();
        return;
      }

      device.lost.then((info) => {
        if (disposed || info.reason === 'destroyed') return;
        handleFailure(`device lost: ${info.message}`);
      });
      device.addEventListener('uncapturederror', (event) => {
        handleFailure('uncaptured GPU error', (event as GPUUncapturedErrorEvent).error);
      });

      context = canvas.getContext('webgpu');
      if (!context) {
        handleFailure('canvas.getContext("webgpu") returned null');
        stop();
        return;
      }

      const format = gpu.getPreferredCanvasFormat();
      context.configure({ device, format, alphaMode: 'premultiplied' });

      const shaderModule = device.createShaderModule({
        code: shaderSource,
        label: 'liquid-orb',
      });
      if ('getCompilationInfo' in shaderModule) {
        const info = await shaderModule.getCompilationInfo();
        const errors = info.messages.filter((m) => m.type === 'error');
        if (errors.length) {
          handleFailure(
            `WGSL compile error line ${errors[0].lineNum}: ${errors[0].message}`,
          );
          stop();
          return;
        }
      }
      if (disposed) return;

      const pipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: { module: shaderModule, entryPoint: 'vs_main' },
        fragment: { module: shaderModule, entryPoint: 'fs_main', targets: [{ format }] },
        primitive: { topology: 'triangle-list' },
      });

      const uniformBuffer = device.createBuffer({
        size: ORB_UNIFORM_BYTES,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
      });

      const uniforms = createOrbUniformData();
      const start = performance.now();

      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const rect = canvas.getBoundingClientRect();
        const w = Math.max(1, Math.round(rect.width * dpr));
        const h = Math.max(1, Math.round(rect.height * dpr));
        if (canvas.width !== w) canvas.width = w;
        if (canvas.height !== h) canvas.height = h;
      };
      resize();
      observer = new ResizeObserver(resize);
      observer.observe(canvas);

      setState('running');

      const draw = () => {
        if (disposed || !device || !context) return;

        // Ease toward the target excitement so focus/typing feels liquid, not steppy.
        const target = Math.min(1, Math.max(0, excitementRef.current));
        smoothedRef.current += (target - smoothedRef.current) * 0.06;
        const e = smoothedRef.current;

        uniforms[U_SIZE_X] = canvas.width;
        uniforms[U_SIZE_Y] = canvas.height;
        uniforms[U_TIME] = reduceMotion
          ? REDUCED_MOTION_TIME
          : (performance.now() - start) / 1000;
        uniforms[U_EXPOSURE] = BASE_EXPOSURE * (1 + 0.28 * e);
        uniforms[U_EDGE_GLOW] = BASE_EDGE_GLOW * (1 + 0.9 * e);
        device.queue.writeBuffer(uniformBuffer, 0, uniforms);

        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass({
          colorAttachments: [
            {
              view: context.getCurrentTexture().createView(),
              clearValue: { r: 0, g: 0, b: 0, a: 0 },
              loadOp: 'clear',
              storeOp: 'store',
            },
          ],
        });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(3);
        pass.end();
        device.queue.submit([encoder.finish()]);

        frame = requestAnimationFrame(draw);
      };

      frame = requestAnimationFrame(draw);
    };

    // Deferred to a microtask so no setState happens synchronously in the effect body.
    void Promise.resolve().then(boot);

    const onPageHide = () => stop();
    window.addEventListener('pagehide', onPageHide);

    return () => {
      disposed = true;
      window.removeEventListener('pagehide', onPageHide);
      stop();
    };
  }, [handleFailure]);

  if (state === 'unsupported') {
    return <CssOrbFallback className={className} />;
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`h-full w-full ${state === 'booting' ? 'opacity-0' : 'opacity-100'} transition-opacity duration-700 ${className}`}
    />
  );
};

/** Animated CSS stand-in used wherever WebGPU is unavailable. */
const CssOrbFallback: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div aria-hidden="true" className={`relative h-full w-full ${className}`}>
    <div className="orb-fallback absolute left-1/2 top-1/2 aspect-square w-[60%] -translate-x-1/2 -translate-y-1/2 rounded-full" />
    <div className="orb-fallback-sheen absolute left-1/2 top-1/2 aspect-square w-[60%] -translate-x-1/2 -translate-y-1/2 rounded-full" />
  </div>
);
