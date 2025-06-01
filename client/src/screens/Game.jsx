import React, { StrictMode, Component } from "react";

import { Frame, Circle, Dial, Emitter, Pen, MotionController, series, LabelOnArc } from "zimjs"
import iconTable from '../assets/table.svg';
import iconTableedge from '../assets/tableedge.svg';
import iconBackicon from '../assets/backicon.svg';
import iconTHicon from '../assets/THicon.svg';
import iconTSicon from '../assets/TSicon.svg';
import iconQDicon from '../assets/QDicon.svg';
import iconQHicon from '../assets/QHicon.svg';
import iconQSicon from '../assets/QSicon.svg';
import iconTCicon from '../assets/TCicon.svg';
import iconTDicon from '../assets/TDicon.svg';
import iconKHicon from '../assets/KHicon.svg';
import iconKSicon from '../assets/KSicon.svg';
import iconQCicon from '../assets/QCicon.svg';
import iconJSicon from '../assets/JSicon.svg';
import iconKCicon from '../assets/KCicon.svg';
import iconKDicon from '../assets/KDicon.svg';
import iconJHicon from '../assets/JHicon.svg';
import iconJKBLACKicon from '../assets/JKBLACKicon.svg';
import iconJKREDicon from '../assets/JKREDicon.svg';
import iconJCicon from '../assets/JCicon.svg';
import iconJDicon from '../assets/JDicon.svg';
import iconACicon from '../assets/ACicon.svg';
import iconADicon from '../assets/ADicon.svg';
import iconAHicon from '../assets/AHicon.svg';
import iconASicon from '../assets/ASicon.svg';
import icon9D from '../assets/9Dicon.svg';
import icon9H from '../assets/9Hicon.svg';
import icon9S from '../assets/9Sicon.svg';
import icon8S from '../assets/8Sicon.svg';
import icon9C from '../assets/9Cicon.svg';
import icon7S from '../assets/7Sicon.svg';
import icon8C from '../assets/8Cicon.svg';
import icon8D from '../assets/8Dicon.svg';
import icon8H from '../assets/8Hicon.svg';
import icon6S from '../assets/6Sicon.svg';
import icon7C from '../assets/7Cicon.svg';
import icon7D from '../assets/7Dicon.svg';
import icon7H from '../assets/7Hicon.svg';
import icon6C from '../assets/6Cicon.svg';
import icon6D from '../assets/6Dicon.svg';
import icon6H from '../assets/6Hicon.svg';
import icon4H from '../assets/4Hicon.svg';
import icon4S from '../assets/4Sicon.svg';
import icon5C from '../assets/5Cicon.svg';
import icon5D from '../assets/5Dicon.svg';
import icon5H from '../assets/5Hicon.svg';
import icon5S from '../assets/5Sicon.svg';
import icon3S from '../assets/3Sicon.svg';
import icon4C from '../assets/4Cicon.svg';
import icon4D from '../assets/4Dicon.svg';
import icon2S from '../assets/2Sicon.svg';
import icon3C from '../assets/3Cicon.svg';
import icon3D from '../assets/3Dicon.svg';
import icon3H from '../assets/3Hicon.svg';
import icon2D from '../assets/2Dicon.svg';
import icon2H from '../assets/2Hicon.svg';
import icon2C from '../assets/2Cicon.svg';
class ZimFrame extends Component {
  componentDidMount() {
    this.frame = new Frame({
      scaling: "zim",
      width: 600,
      height: 300,
      color: lighter,
      mouseMoveOutside: true,
      ready: () => {
        // ~~~~~~~~~~~~~~~~~~
        // INTRO
        // ZIM is a general canvas framework at https://zimjs.com
        // Below we show a few features - but this is a small sampling
        // ZIM also makes easy Puzzles, Parallax, Drawings, Connectors, HitTests,
        // Sprites, Animations, Shaders, Effects, Games, Dialogs, Visualizations
        // https://zimjs.com/editor - see ZAPPS section
        // https://zimjs.com/examples for many examples
        // https://zimjs.com/code for CDN templates without NPM


        // ~~~~~~~~~~~~~~~~~~
        // SHAPES
        // ZIM has lots of shapes including Blob and Squiggle for free-form shapes
        // We can add transform(), gesture() and 80 other methods - here we drag()
        // normally, drag() objects come up on top but that would put the circle above the emitter
        // ZIM has chaining for most methods
        const circle = new Circle(50, purple)
              .center()
              .drag({ onTop: false })

        // ~~~~~~~~~~~~~~~~~~
        // ANIMATION
        // ZIM has industry leading animation on par with GSAP and beyond
        // with animation along user editable paths, sequencing and series, and much more
        // and so easy to use - at 30% the code of HTML/CSS animations
              .animate({
                props: { color: red },
                time: 2,
                rewind: true,
                loop: true
              })


        // ~~~~~~~~~~~~~~~~~~
        // COMPONENTS
        // ZIM has over 40 components - see https://zimjs.com/uiux.html
        // and optional normal parameters or a config object - we call this ZIM DUO
        const dial = new Dial({ min: 1, max: 3, step: 0, backgroundColor: blue })
              .sca(.5)
              .pos(20, 20, RIGHT, BOTTOM)
              .change(() => { circle.sca(dial.currentValue) }) // could also use wire()


        // ~~~~~~~~~~~~~~~~~~
        // CONTROLS
        // ZIM has dozens of controls like Tile, Wrapper, Layout, Pages, SoundWave, Parallax, Synth, etc.
        // We show the Emitter and Pen here
        const emitter = new Emitter({ startPaused: true })

        circle.on("pressup", () => {
          emitter.loc(circle).spurt(10)
        })

        // ZIM has dynamic parameters - we call this ZIM VEE
        // An array [] picks randomly, or use a min, max {}, series or result of a function
        // The pen lines can be dragged, double clicked or held to be deleted
        // ZIM has all sorts of features for Art and Data Visualization
        // see https://zimjs.com/art.html and https://zimjs.com/data.html
        const pen = new Pen({ min: 10, max: 60 }, series(pink, white)).addTo().bot()

        // MotionController controls movement of any DisplayObject in various ways:
        // mousemove, pressmove, pressdrag, keydown, gamebutton, gamestick, swipe, follow, manual
        // Note the mousedownIncludes parameter if wanting to draw on things
        new MotionController(pen, "pressmove")


        // ~~~~~~~~~~~~~~~~~~
        // TEXT
        // ZIM has Label(), LabelLetters(), LabelWords(), LabelOnPath(), TextInput()
        // for various features with text
        new LabelOnArc("DRAW ON BACKING", 12, undefined, dark)
          .center()
          .animate({ wait: 2, props: { alpha: 0 } })

      }
    })
  }

  componentWillUnmount() {
    this.frame?.dispose()
  }

  render() {
    return null
  }
}

function Game() {
  return (
    <>
      <div>
        <StrictMode>
          <div id="zim" />
        </StrictMode>
        <ZimFrame />
      </div>
    </>
  );
}

export default Game;
