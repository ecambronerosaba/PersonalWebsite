import React from "react";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";

import "./CSS/Experience.css";

const ExperiencePage = () => {
  return (
    <div className="App">
      <h1>Previous work experience:</h1>
      <Tabs>
        <TabList>
          <Tab>
            <p>Netflix</p>
          </Tab>
          <Tab>
            <p>Meta</p>
          </Tab>
          <Tab>
            <p>Enya</p>
          </Tab>
          <Tab>
            <p>Section Leading</p>
          </Tab>
        </TabList>

        <TabPanel className="list">
          <div className="panel-content">
            <h2>Software Engineer @ Netflix</h2>
            <h3>August 2023 - Present</h3>
          </div>
        </TabPanel>
        <TabPanel>
          <div className="panel-content">
            <h2>Software Engineering Intern @ Meta</h2>
            <h3>June 2022 - September 2022</h3>
            <ul>
              <li>Created an internal self-service tool </li>
              <ul>
                <li>
                  {" "}
                  Full stack tooling involving schema creation and frontend
                  design
                </li>
              </ul>
              <li>
                Worked closely with several teams to coordinate infrastructure
                <ul>
                  <li>Made sure expectations for all teams were met</li>
                </ul>
              </li>
              <li>Developed with React, Hack, GraphQL, and Relay </li>
            </ul>
          </div>
        </TabPanel>
        <TabPanel>
          <div className="panel-content">
            <h2>Software Engineering Intern @ Enya</h2>
            <h3>June 2021 - September 2021</h3>
            <ul>
              <li>Helped develop an L2 solution for the Ethereum blockchain</li>
              <li>
                Worked on the frontend of the Enya website and DAO
                <ul>
                  <li>Provided integration test and forked the Compound DAO</li>
                </ul>
              </li>
              <li>
                {" "}
                Performed research on security vulnerabilities in smart
                contracts
              </li>
              <li>
                {" "}
                Wrote several articles for OMGX documentation
                <ul>
                  <li>Developed with Solidity, Git, Java, and Linux</li>
                </ul>
              </li>
            </ul>
          </div>
        </TabPanel>
        <TabPanel>
          <div className="panel-content">
            <h2>Section Leader for Introductory CS Class @ Stanford</h2>
            <h3>April 2020 - March 2023</h3>
            <ul>
              <li>
                Teaching a group of 7 - 13 students twice a week for both
                courses at Stanford University
              </li>
              <li>
                Teaching example problems in a variety of concepts from
                recursion to pointer implementation{" "}
              </li>
              <li>
                Small group leader for Section Leading teaching 3 other section
                leaders how to teach CS106B
                <ul>
                  <li>
                    All mentees reported a higher level of confidence with
                    teaching
                  </li>
                </ul>
              </li>
            </ul>
          </div>
        </TabPanel>
      </Tabs>
    </div>
  );
};

export default ExperiencePage;
