// @ts-nocheck
"use client";

import { Canvas, extend, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useTexture } from "@react-three/drei";
import {
  BallCollider,
  CuboidCollider,
  Physics,
  RigidBody,
  useRopeJoint,
  useSphericalJoint,
} from "@react-three/rapier";
import { MeshLineGeometry, MeshLineMaterial } from "meshline";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import "./lanyard.css";

extend({ MeshLineGeometry, MeshLineMaterial });

const CARD_MODEL_URL = "/media/lanyard/card.glb";
const LANYARD_TEXTURE_URL = "/media/lanyard/lanyard.png";
const CONTACT_PORTRAIT_URL = "/media/contact/liuker-avatar.png";
const FRONT_UV_RECT = { x: 0, y: 0, w: 0.5, h: 0.755 };
const BACK_UV_RECT = { x: 0.5, y: 0, w: 0.5, h: 0.757 };

function drawCover(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const imageWidth = image.width || width;
  const imageHeight = image.height || height;
  const scale = Math.max(width / imageWidth, height / imageHeight);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
  context.drawImage(
    image,
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
}

function drawFrontFace(
  context: CanvasRenderingContext2D,
  portrait: CanvasImageSource,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  context.save();
  context.beginPath();
  context.rect(x, y, width, height);
  context.clip();
  context.fillStyle = "#f2f0eb";
  context.fillRect(x, y, width, height);

  const margin = width * 0.06;
  const photoHeight = height * 0.76;
  context.save();
  context.beginPath();
  context.roundRect(x + margin, y + margin, width - margin * 2, photoHeight, width * 0.035);
  context.clip();
  drawCover(context, portrait, x + margin, y + margin, width - margin * 2, photoHeight);
  const photoShade = context.createLinearGradient(0, y + photoHeight * 0.72, 0, y + photoHeight + margin);
  photoShade.addColorStop(0, "rgba(5, 6, 16, 0)");
  photoShade.addColorStop(1, "rgba(5, 6, 16, 0.45)");
  context.fillStyle = photoShade;
  context.fillRect(x + margin, y + margin, width - margin * 2, photoHeight);
  context.restore();

  context.fillStyle = "#11131a";
  context.font = `800 ${Math.round(width * 0.09)}px Kanit, Arial`;
  context.letterSpacing = `${Math.round(width * 0.014)}px`;
  context.fillText("LIUKER", x + margin, y + height * 0.89);
  context.fillStyle = "rgba(17, 19, 26, 0.58)";
  context.font = `600 ${Math.round(width * 0.031)}px Kanit, Arial`;
  context.letterSpacing = `${Math.round(width * 0.006)}px`;
  context.fillText("VIDEO CREATOR · PORTFOLIO 2026", x + margin, y + height * 0.945);
  context.restore();
}

function drawBackFace(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  context.save();
  context.beginPath();
  context.rect(x, y, width, height);
  context.clip();
  context.fillStyle = "#f2f0eb";
  context.fillRect(x, y, width, height);

  const gradient = context.createLinearGradient(x, y, x + width, y + height);
  gradient.addColorStop(0, "rgba(79, 33, 142, 0.08)");
  gradient.addColorStop(0.56, "rgba(182, 0, 168, 0.22)");
  gradient.addColorStop(1, "rgba(255, 106, 0, 0.2)");
  context.fillStyle = gradient;
  context.fillRect(x, y, width, height);

  context.fillStyle = "#11131a";
  context.font = `900 ${Math.round(width * 0.16)}px Kanit, Arial`;
  context.letterSpacing = `${Math.round(width * -0.01)}px`;
  context.fillText("LIUKER", x + width * 0.08, y + height * 0.46);
  context.fillStyle = "rgba(17, 19, 26, 0.6)";
  context.font = `600 ${Math.round(width * 0.04)}px Kanit, Arial`;
  context.letterSpacing = `${Math.round(width * 0.012)}px`;
  context.fillText("DIRECTION · EDIT · MOTION", x + width * 0.08, y + height * 0.55);
  context.strokeStyle = "rgba(17, 19, 26, 0.22)";
  context.lineWidth = Math.max(1, width * 0.003);
  context.beginPath();
  context.moveTo(x + width * 0.08, y + height * 0.72);
  context.lineTo(x + width * 0.92, y + height * 0.72);
  context.stroke();
  context.restore();
}

function createLiukerCardMap(baseMap: THREE.Texture, portrait: THREE.Texture) {
  const baseImage = baseMap?.image;
  const portraitImage = portrait?.image;
  if (!baseImage || !portraitImage || typeof document === "undefined") return baseMap;

  const canvas = document.createElement("canvas");
  canvas.width = baseImage.width;
  canvas.height = baseImage.height;
  const context = canvas.getContext("2d");
  if (!context) return baseMap;
  context.drawImage(baseImage, 0, 0, canvas.width, canvas.height);

  const front = {
    x: FRONT_UV_RECT.x * canvas.width,
    y: FRONT_UV_RECT.y * canvas.height,
    width: FRONT_UV_RECT.w * canvas.width,
    height: FRONT_UV_RECT.h * canvas.height,
  };
  const back = {
    x: BACK_UV_RECT.x * canvas.width,
    y: BACK_UV_RECT.y * canvas.height,
    width: BACK_UV_RECT.w * canvas.width,
    height: BACK_UV_RECT.h * canvas.height,
  };
  drawFrontFace(context, portraitImage, front.x, front.y, front.width, front.height);
  drawBackFace(context, back.x, back.y, back.width, back.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = baseMap.flipY;
  texture.anisotropy = 16;
  texture.needsUpdate = true;
  return texture;
}

function Band({ isMobile = false, lanyardWidth = 0.78 }) {
  const ropeSegmentLength = 0.78;
  const cardAttachmentY = 1.5;
  const cardMinimumY = 0;
  const band = useRef();
  const fixed = useRef();
  const j1 = useRef();
  const j2 = useRef();
  const j3 = useRef();
  const card = useRef();
  const [dragged, drag] = useState(false);
  const [hovered, hover] = useState(false);
  const { size } = useThree();
  const { nodes, materials } = useGLTF(CARD_MODEL_URL);
  const portraitTexture = useTexture(CONTACT_PORTRAIT_URL);
  const bandTexture = useTexture(LANYARD_TEXTURE_URL);
  const cardMap = useMemo(
    () => createLiukerCardMap(materials.base.map, portraitTexture),
    [materials.base.map, portraitTexture],
  );
  const curve = useMemo(() => {
    const nextCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.5, -2.34, 0),
      new THREE.Vector3(0.35, -1.56, 0),
      new THREE.Vector3(0.15, -0.78, 0),
      new THREE.Vector3(0, 0, 0),
    ]);
    nextCurve.curveType = "centripetal";
    return nextCurve;
  }, []);
  const vec = useMemo(() => new THREE.Vector3(), []);
  const ang = useMemo(() => new THREE.Vector3(), []);
  const rot = useMemo(() => new THREE.Vector3(), []);
  const dir = useMemo(() => new THREE.Vector3(), []);
  const segmentProps = {
    type: "dynamic",
    canSleep: true,
    colliders: false,
    angularDamping: 4,
    linearDamping: 4,
  };

  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], ropeSegmentLength]);
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], ropeSegmentLength]);
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], ropeSegmentLength]);
  useSphericalJoint(j3, card, [[0, 0, 0], [0, cardAttachmentY, 0]]);

  useEffect(() => {
    if (!hovered) return;
    document.body.style.cursor = dragged ? "grabbing" : "grab";
    return () => {
      document.body.style.cursor = "auto";
    };
  }, [hovered, dragged]);

  useEffect(() => {
    bandTexture.colorSpace = THREE.SRGBColorSpace;
    bandTexture.wrapS = bandTexture.wrapT = THREE.RepeatWrapping;
    bandTexture.repeat.set(-4, 1);
    bandTexture.needsUpdate = true;
  }, [bandTexture]);

  useEffect(() => () => {
    if (cardMap !== materials.base.map) cardMap?.dispose();
  }, [cardMap, materials.base.map]);

  useEffect(() => {
    band.current?.geometry.setPoints(curve.getPoints(isMobile ? 18 : 34));
  }, [curve, isMobile]);

  useFrame((state, delta) => {
    if (dragged) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      dir.copy(vec).sub(state.camera.position).normalize();
      vec.add(dir.multiplyScalar(state.camera.position.length()));
      [card, j1, j2, j3, fixed].forEach((ref) => ref.current?.wakeUp());
      card.current?.setNextKinematicTranslation({
        x: vec.x - dragged.x,
        y: Math.max(vec.y - dragged.y, cardMinimumY),
        z: vec.z - dragged.z,
      });
    }

    if (!fixed.current || !j1.current || !j2.current || !j3.current || !card.current) return;
    const cardTranslation = card.current.translation();
    if (!dragged && cardTranslation.y < cardMinimumY) {
      const velocity = card.current.linvel();
      card.current.setTranslation(
        { x: cardTranslation.x, y: cardMinimumY, z: cardTranslation.z },
        true,
      );
      card.current.setLinvel(
        { x: velocity.x, y: Math.max(0, velocity.y), z: velocity.z },
        true,
      );
    }
    [j1, j2].forEach((ref) => {
      if (!ref.current.lerped) {
        ref.current.lerped = new THREE.Vector3().copy(ref.current.translation());
      }
      const translation = ref.current.translation();
      if (![translation.x, translation.y, translation.z].every(Number.isFinite)) return;
      const distance = ref.current.lerped.distanceTo(translation);
      const speed = THREE.MathUtils.clamp(distance, 0.1, 1);
      ref.current.lerped.lerp(translation, THREE.MathUtils.clamp(delta * speed * 45, 0, 1));
    });

    const translations = [
      j3.current.translation(),
      j2.current.lerped,
      j1.current.lerped,
      fixed.current.translation(),
    ];
    const isFinitePoint = (point) =>
      point && [point.x, point.y, point.z].every(Number.isFinite);

    if (translations.every(isFinitePoint)) {
      translations.forEach((point, index) => curve.points[index].copy(point));

      // Rope joints can briefly overlap when the physics scene wakes up. Keep
      // the spline control points distinct so MeshLine never receives NaNs.
      for (let index = 1; index < curve.points.length; index += 1) {
        if (curve.points[index].distanceToSquared(curve.points[index - 1]) < 1e-8) {
          curve.points[index].y += index * 0.0001;
        }
      }

      const linePoints = curve.getPoints(isMobile ? 18 : 34);
      if (linePoints.every(isFinitePoint)) {
        band.current?.geometry.setPoints(linePoints);
      }
    }
    ang.copy(card.current.angvel());
    rot.copy(card.current.rotation());
    card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.24, z: ang.z });
  });

  return (
    <group position={[0, 4.3, 0]}>
      <RigidBody ref={fixed} {...segmentProps} type="fixed" />
      <RigidBody position={[0.15, -0.78, 0]} ref={j1} {...segmentProps}>
        <BallCollider args={[0.1]} />
      </RigidBody>
      <RigidBody position={[0.35, -1.56, 0]} ref={j2} {...segmentProps}>
        <BallCollider args={[0.1]} />
      </RigidBody>
      <RigidBody position={[0.5, -2.34, 0]} ref={j3} {...segmentProps}>
        <BallCollider args={[0.1]} />
      </RigidBody>
      <RigidBody
        position={[0.65, -3.84, 0]}
        ref={card}
        {...segmentProps}
        type={dragged ? "kinematicPosition" : "dynamic"}
      >
        <CuboidCollider args={[0.8, 1.125, 0.01]} />
        <group
          scale={2.25}
          position={[0, -1.2, -0.05]}
          onPointerOver={() => hover(true)}
          onPointerOut={() => hover(false)}
          onPointerUp={(event) => {
            event.target.releasePointerCapture?.(event.pointerId);
            drag(false);
          }}
          onPointerDown={(event) => {
            event.target.setPointerCapture?.(event.pointerId);
            drag(new THREE.Vector3().copy(event.point).sub(vec.copy(card.current.translation())));
          }}
        >
          <mesh geometry={nodes.card.geometry} castShadow receiveShadow>
            <meshPhysicalMaterial
              map={cardMap}
              map-anisotropy={16}
              clearcoat={isMobile ? 0.25 : 1}
              clearcoatRoughness={0.15}
              roughness={0.78}
              metalness={0.58}
            />
          </mesh>
          <mesh
            geometry={nodes.clip.geometry}
            material={materials.metal}
            material-roughness={0.3}
            castShadow
          />
          <mesh geometry={nodes.clamp.geometry} material={materials.metal} castShadow />
        </group>
      </RigidBody>
      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial
          color="#ffffff"
          depthTest={false}
          resolution={[size.width, size.height]}
          useMap={Boolean(bandTexture)}
          map={bandTexture}
          repeat={[-4, 1]}
          lineWidth={lanyardWidth}
          transparent
        />
      </mesh>
    </group>
  );
}

useGLTF.preload(CARD_MODEL_URL);

export default function Lanyard({
  active = true,
  position = [0, 0, 18],
  gravity = [0, -38, 0],
  fov = 28,
}: {
  active?: boolean;
  position?: [number, number, number];
  gravity?: [number, number, number];
  fov?: number;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const updateMobile = () => setIsMobile(window.innerWidth < 768);
    updateMobile();
    window.addEventListener("resize", updateMobile);
    return () => window.removeEventListener("resize", updateMobile);
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="lanyard-wrapper"
      role="img"
      aria-label="Interactive LIUKER contact lanyard. Drag the card to move it."
    >
      <Canvas
        camera={{ position, fov }}
        dpr={[1, isMobile ? 1.2 : 1.6]}
        frameloop={active ? "always" : "never"}
        gl={{ alpha: true, antialias: !isMobile, powerPreference: "high-performance" }}
        shadows={!isMobile}
      >
        <ambientLight intensity={2.4} />
        <directionalLight position={[-5, 8, 10]} intensity={3.4} color="#ffffff" />
        <pointLight position={[6, -2, 7]} intensity={28} color="#bd26ff" distance={18} />
        <pointLight position={[-6, 2, 4]} intensity={20} color="#ff623e" distance={18} />
        <Suspense fallback={null}>
          <Physics gravity={gravity} timeStep={isMobile ? 1 / 30 : 1 / 60}>
            <Band isMobile={isMobile} />
          </Physics>
        </Suspense>
      </Canvas>
      <span className="lanyard-instruction" aria-hidden="true">
        <i /> Drag the card
      </span>
    </div>
  );
}
