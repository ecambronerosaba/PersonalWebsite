import React from "react";
import Slider from "react-slick";
import PhotoAlbum from "react-photo-album";

import "./CSS/About.css";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

function AboutPage() {
  const sliderSettings = {
    dots: true,
    infinite: true,
    adaptiveHeight: true,
    arrows: true,
    autoplaySpeed: 10000,
    speed: 500,
    slidesToShow: 1,
    fade: true,
    slidesToScroll: 1,
  };

  const breakpoints = [1080, 640, 384, 256, 128, 96, 64, 48];

  const unsplashLink = (id, width, height) =>
    `https://source.unsplash.com/${id}/${width}x${height}`;

  const unsplashPhotos = [
    { id: "8gVv6nxq6gY", width: 1080, height: 800 },
    { id: "Dhmn6ete6g8", width: 1080, height: 1620 },
    { id: "RkBTPqPEGDo", width: 1080, height: 720 },
    { id: "Yizrl9N_eDA", width: 1080, height: 721 },
    { id: "KG3TyFi0iTU", width: 1080, height: 1620 },
    { id: "Jztmx9yqjBw", width: 1080, height: 607 },
    { id: "-heLWtuAN3c", width: 1080, height: 608 },
    { id: "xOigCUcFdA8", width: 1080, height: 720 },
    { id: "1azAjl8FTnU", width: 1080, height: 1549 },
    { id: "ALrCdq-ui_Q", width: 1080, height: 720 },
    { id: "twukN12EN7c", width: 1080, height: 694 },
    { id: "9UjEyzA6pP4", width: 1080, height: 1620 },
    { id: "sEXGgun3ZiE", width: 1080, height: 720 },
    { id: "S-cdwrx-YuQ", width: 1080, height: 1440 },
    { id: "q-motCAvPBM", width: 1080, height: 1620 },
    { id: "Xn4L310ztMU", width: 1080, height: 810 },
    { id: "iMchCC-3_fE", width: 1080, height: 610 },
    { id: "X48pUOPKf7A", width: 1080, height: 160 },
    { id: "GbLS6YVXj0U", width: 1080, height: 810 },
    { id: "9CRd1J1rEOM", width: 1080, height: 720 },
    { id: "xKhtkhc9HbQ", width: 1080, height: 1440 },
  ];

  const photos = unsplashPhotos.map((photo) => ({
    src: unsplashLink(photo.id, photo.width, photo.height),
    width: photo.width,
    height: photo.height,
    srcSet: breakpoints.map((breakpoint) => {
      const height = Math.round((photo.height / photo.width) * breakpoint);
      return {
        src: unsplashLink(photo.id, breakpoint, height),
        width: breakpoint,
        height,
      };
    }),
  }));

  return (
    <div>
      <div className="banner">
        <h1>About Me</h1>
      </div>
      {/* TODO: INSERT BACKGROUND IMAGE */}
      {/* TODO: CSS for big-title */}
      <div className="introduction">
        <img
          src="https://alohe.github.io/memojis/assets/imgs/2821.png"
          alt="Profile"
          className="profile-image"
        />
        <div className="text-content">
          <h2 className="big-title">Hey, I'm Esteban!</h2>
          <p>
            Welcome to my corner of the internet! As a career I've focused on
            building around software. My interest in software development
            started in my middle school when I volunteered to make a website for
            my mom's spanish teaching business. Albeit a terrible website it
            made me realize how much I loved solving problems with software.
          </p>
          <p>
            I'm working at Netflix where I'm focusing on privacy and security.
          </p>
          <p>
            In my free time, I enjoy other types of making such as 3D modeling,
            and I'm always looking for new challenges and opportunities to
            learn.
          </p>
        </div>
      </div>
      {/* TODO: CSS for hobby */}
      <h2 className="big-title hobby-title">Hobbies</h2>
      <div className="container">
        <Slider {...sliderSettings}>
          <div>
            <h3 className="hobby-title">3D Printing</h3>
            <div className="hobby-content">
              <img
                src="https://i.makeagif.com/media/8-15-2019/MLt1CB.gif"
                className="3d-printing"
                alt="3D Printing"
              />
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non
                tincidunt eros. Phasellus ut nunc vitae nulla convallis
                hendrerit. Fusce tincidunt risus et mi gravida aliquam. Integer
                sit amet neque faucibus, bibendum metus id, rutrum neque. Sed
                auctor, lacus ut faucibus congue, lectus erat posuere sapien,
                vitae semper nulla dolor vel nunc. Donec malesuada, lorem nec
                volut
              </p>
            </div>
          </div>
          <div>
            <h3 className="hobby-title">Coffee</h3>
            <div className="hobby-content">
              <img
                src="https://i.gifer.com/AdF1.gif"
                className="3d-printing"
                alt="3D Printing"
              />
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non
                tincidunt eros. Phasellus ut nunc vitae nulla convallis
                hendrerit. Fusce tincidunt risus et mi gravida aliquam. Integer
                sit amet neque faucibus, bibendum metus id, rutrum neque. Sed
                auctor, lacus ut faucibus congue, lectus erat posuere sapien,
                vitae semper nulla dolor vel nunc. Donec malesuada, lorem nec
                volut
              </p>
            </div>
          </div>
          <div>
            <h3 className="hobby-title">Drawing</h3>
            <div className="collage-container">
              <PhotoAlbum photos={photos} layout="masonry" />
            </div>
          </div>
        </Slider>
      </div>
    </div>
  );
}

export default AboutPage;
