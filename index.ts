import { DirectionalLight, Matrix4, PerspectiveCamera, Scene, WebGLRenderer, AmbientLight } from 'three';
import { Loader } from "@googlemaps/js-api-loader";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
let map: google.maps.Map;
const ZOOM = 7;
const apiOptions = {
  apiKey: 'AIzaSyAQkoRaEefK8pUcmb8D46DNfGZwREwcUZ0',
  version: "beta",
};
const mapOptions = {
  center: { lat: 37.408441988224936, lng: 127.57328066514565 },
  zoom: ZOOM,
  heading: 0,
  tilt: 45,
  mapId: 'c994d9519913ac5f',
  disableDefaultUI: true,
};
async function initMap() {
  const mapDiv = document.getElementById("map") as HTMLElement;
  const apiLoader = new Loader(apiOptions);
  await apiLoader.load();
  map = new google.maps.Map(mapDiv, mapOptions);
  initWebglOverlayView(map);
  return map;
}
function initWebglOverlayView(map: google.maps.Map): void {
  let scene, renderer, camera, loader;
  const webglOverlayView = new google.maps.WebGLOverlayView();

  webglOverlayView.onAdd = () => {
    // Set up the scene.

    scene = new Scene();

    camera = new PerspectiveCamera();

    const ambientLight = new AmbientLight(0xffffff, 0.75); // Soft white light.
    scene.add(ambientLight);

    const directionalLight = new DirectionalLight(0xffffff, 0.25);
    directionalLight.position.set(0.5, -1, 0.5);
    scene.add(directionalLight);

    // Load the model.
    loader = new GLTFLoader();
    const source =
      "https://raw.githubusercontent.com/googlemaps/js-samples/main/assets/pin.gltf";
    loader.load(source, (gltf) => {
      gltf.scene.scale.set(10, 10, 10);
      gltf.scene.rotation.x = Math.PI; // Rotations are in radians.
      scene.add(gltf.scene);
    });
  };

  webglOverlayView.onContextRestored = ({ gl }) => {
    // Create the js renderer, using the
    // maps's WebGL rendering context.
    renderer = new WebGLRenderer({
      canvas: gl.canvas,
      context: gl,
      ...gl.getContextAttributes(),
    });
    renderer.autoClear = false;

    // Wait to move the camera until the 3D model loads.
    loader.manager.onLoad = () => {
      renderer.setAnimationLoop(() => {
        webglOverlayView.requestRedraw();
        const { tilt, heading, zoom } = mapOptions;
        map.moveCamera({ tilt, heading, zoom });

        // Rotate the map 360 degrees.
        if (mapOptions.tilt < 67.5) {
          mapOptions.tilt += 0.5;
        } else if (mapOptions.heading <= 360) {
          mapOptions.heading += 0.2;
          mapOptions.zoom -= 0.0005;
        } else {
          renderer.setAnimationLoop(null);
        }
      });
    };
  };

  webglOverlayView.onDraw = ({ gl, transformer }): void => {
    const latLngAltitudeLiteral: google.maps.LatLngAltitudeLiteral = {
      lat: mapOptions.center.lat,
      lng: mapOptions.center.lng,
      altitude: 100,
    };

    // Update camera matrix to ensure the model is georeferenced correctly on the map.
    const matrix = transformer.fromLatLngAltitude(latLngAltitudeLiteral);
    camera.projectionMatrix = new Matrix4().fromArray(matrix);

    webglOverlayView.requestRedraw();
    renderer.render(scene, camera);

    // Sometimes it is necessary to reset the GL state.
    renderer.resetState();
  };
  webglOverlayView.setMap(map);
}

declare global {
  interface Window {
    initMap: () => void;
  }
}
window.initMap = initMap;
