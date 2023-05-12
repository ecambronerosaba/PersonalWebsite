import React from "react";
import Slider from "react-slick";

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
              <img
                src="https://images.unsplash.com/photo-1517088455889-bfa75135412c?ixlib=rb-0.3.5&ixid=eyJhcHBfaWQiOjEyMDd9&s=e5548929376f93d8b1b7a21097df03bd&auto=format&fit=crop&w=749&q=80"
                alt="placeholder image"
              />
            </div>
          </div>
        </Slider>
      </div>
    </div>
  );
}

export default AboutPage;
