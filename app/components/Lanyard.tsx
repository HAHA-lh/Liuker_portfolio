// @ts-nocheck
"use client";

import { Canvas, extend, useFrame, useThree } from "@react-three/fiber";
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

function createCardTexture(side: "front" | "back") {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 1260;
  const context = canvas.getContext("2d");
  if (!context) return null;

  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  if (side === "front") {
    gradient.addColorStop(0, "#11131a");
    gradient.addColorStop(0.58, "#17101f");
    gradient.addColorStop(1, "#7f123f");
  } else {
    gradient.addColorStop(0, "#7f00ff");
    gradient.addColorStop(0.55, "#c20ca7");
    gradient.addColorStop(1, "#ff6c43");
  }
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.globalAlpha = 0.18;
  context.fillStyle = "#ffffff";
  for (let x = 26; x < canvas.width; x += 32) {
    for (let y = 26; y < canvas.height; y += 32) {
      context.beginPath();
      context.arc(x, y, 1.5, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.globalAlpha = 1;

  context.fillStyle = "rgba(255,255,255,.94)";
  context.font = "700 54px Kanit, Arial";
  context.letterSpacing = "10px";
  context.fillText("LIUKER", 68, 105);

  if (side === "front") {
    context.font = "900 132px Kanit, Arial";
    context.letterSpacing = "-6px";
    context.fillText("VIDEO", 60, 500);
    context.fillText("CREATOR", 60, 630);
    context.fillStyle = "rgba(255,255,255,.62)";
    context.font = "500 25px Kanit, Arial";
    context.letterSpacing = "4px";
    context.fillText("DIRECTION · EDIT · MOTION", 68, 760);
    context.fillStyle = "rgba(255,255,255,.9)";
    context.font = "600 30px Kanit, Arial";
    context.letterSpacing = "2px";
    context.fillText("PORTFOLIO / 2026", 68, 1122);
    context.strokeStyle = "rgba(255,255,255,.35)";
    context.strokeRect(68, 920, 760, 1);
  } else {
    context.font = "900 112px Kanit, Arial";
    context.letterSpacing = "-4px";
    context.fillText("LET'S", 60, 500);
    context.fillText("CREATE", 60, 610);
    context.fillStyle = "rgba(255,255,255,.82)";
    context.font = "500 27px Kanit, Arial";
    context.letterSpacing = "3px";
    context.fillText("THE NEXT FRAME", 68, 730);
    context.font = "600 24px Kanit, Arial";
    context.fillText("DRAG · FLIP · CONNECT", 68, 1122);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function createBandTexture() {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, "#4c00ff");
  gradient.addColorStop(0.45, "#bc0eb4");
  gradient.addColorStop(1, "#ff6e42");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(255,255,255,.9)";
  context.font = "700 38px Kanit, Arial";
  context.letterSpacing = "12px";
  context.fillText("LIUKER · LIUKER · LIUKER", 20, 80);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(-3, 1);
  texture.needsUpdate = true;
  return texture;
}

function Band({ isMobile = false, lanyardWidth = 0.78 }) {
  const band = useRef();
  const fixed = useRef();
  const j1 = useRef();
  const j2 = useRef();
  const j3 = useRef();
  const card = useRef();
  const [dragged, drag] = useState(false);
  const [hovered, hover] = useState(false);
  const { size } = useThree();
  const frontTexture = useMemo(() => createCardTexture("front"), []);
  const backTexture = useMemo(() => createCardTexture("back"), []);
  const bandTexture = useMemo(() => createBandTexture(), []);
  const curve = useMemo(
    () => new THREE.CatmullRomCurve3([
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
    ]),
    [],
  );
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

  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1.05]);
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1.05]);
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1.05]);
  useSphericalJoint(j3, card, [[0, 0, 0], [0, 1.88, 0]]);

  useEffect(() => {
    if (!hovered) return;
    document.body.style.cursor = dragged ? "grabbing" : "grab";
    return () => {
      document.body.style.cursor = "auto";
    };
  }, [hovered, dragged]);

  useEffect(() => () => {
    frontTexture?.dispose();
    backTexture?.dispose();
    bandTexture?.dispose();
  }, [frontTexture, backTexture, bandTexture]);

  useFrame((state, delta) => {
    if (dragged) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      dir.copy(vec).sub(state.camera.position).normalize();
      vec.add(dir.multiplyScalar(state.camera.position.length()));
      [card, j1, j2, j3, fixed].forEach((ref) => ref.current?.wakeUp());
      card.current?.setNextKinematicTranslation({
        x: vec.x - dragged.x,
        y: vec.y - dragged.y,
        z: vec.z - dragged.z,
      });
    }

    if (!fixed.current || !j1.current || !j2.current || !j3.current || !card.current) return;
    [j1, j2].forEach((ref) => {
      if (!ref.current.lerped) {
        ref.current.lerped = new THREE.Vector3().copy(ref.current.translation());
      }
      const distance = ref.current.lerped.distanceTo(ref.current.translation());
      const speed = THREE.MathUtils.clamp(distance, 0.1, 1);
      ref.current.lerped.lerp(ref.current.translation(), delta * speed * 45);
    });
    curve.points[0].copy(j3.current.translation());
    curve.points[1].copy(j2.current.lerped);
    curve.points[2].copy(j1.current.lerped);
    curve.points[3].copy(fixed.current.translation());
    band.current?.geometry.setPoints(curve.getPoints(isMobile ? 18 : 34));
    ang.copy(card.current.angvel());
    rot.copy(card.current.rotation());
    card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.24, z: ang.z });
  });

  curve.curveType = "chordal";

  return (
    <group position={[0, 4.3, 0]}>
      <RigidBody ref={fixed} {...segmentProps} type="fixed" />
      <RigidBody position={[0.15, -1.05, 0]} ref={j1} {...segmentProps}>
        <BallCollider args={[0.1]} />
      </RigidBody>
      <RigidBody position={[0.35, -2.1, 0]} ref={j2} {...segmentProps}>
        <BallCollider args={[0.1]} />
      </RigidBody>
      <RigidBody position={[0.5, -3.15, 0]} ref={j3} {...segmentProps}>
        <BallCollider args={[0.1]} />
      </RigidBody>
      <RigidBody
        position={[0.65, -5.15, 0]}
        ref={card}
        {...segmentProps}
        type={dragged ? "kinematicPosition" : "dynamic"}
      >
        <CuboidCollider args={[1.34, 1.86, 0.1]} />
        <group
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
          <mesh castShadow receiveShadow>
            <boxGeometry args={[2.7, 3.75, 0.18, 4, 4, 1]} />
            <meshPhysicalMaterial
              color="#11131a"
              clearcoat={isMobile ? 0.35 : 0.9}
              clearcoatRoughness={0.2}
              roughness={0.36}
              metalness={0.32}
            />
          </mesh>
          <mesh position={[0, 0, 0.096]}>
            <planeGeometry args={[2.58, 3.63]} />
            <meshBasicMaterial map={frontTexture} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0, -0.096]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[2.58, 3.63]} />
            <meshBasicMaterial map={backTexture} toneMapped={false} />
          </mesh>
          <mesh position={[0, 2.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.25, 0.07, 12, 36]} />
            <meshStandardMaterial color="#c8cbd2" metalness={0.9} roughness={0.2} />
          </mesh>
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
          repeat={[-3, 1]}
          lineWidth={lanyardWidth}
          transparent
        />
      </mesh>
    </group>
  );
}

export default function Lanyard({
  position = [0, 0, 18],
  gravity = [0, -38, 0],
  fov = 28,
}: {
  position?: [number, number, number];
  gravity?: [number, number, number];
  fov?: number;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const updateMobile = () => setIsMobile(window.innerWidth < 768);
    updateMobile();
    window.addEventListener("resize", updateMobile);
    return () => window.removeEventListener("resize", updateMobile);
  }, []);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin: "120px" },
    );
    observer.observe(wrapper);
    return () => observer.disconnect();
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
        frameloop={isVisible ? "always" : "never"}
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
