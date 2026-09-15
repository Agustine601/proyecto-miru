import React from 'react';
import styled from 'styled-components';

const Image = styled.img`
  width: 14rem;
  margin: 1.5rem 0;
`;

const Wrapper = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;

  padding-top: 25px;

  font-family: 'MuseoModerno', cursive;
`;

const MainText = styled.p`
  color: #525252;
  margin: 0;
  font-size: 1.5rem;
  text-align: center;
`;

const SubText = styled.p`
  color: #676767;
  font-size: 1rem;
  text-align: center;
`;

const DefaultPage = () => {
  return (
    <Wrapper>
      <Image
        src="./src/assets/logo-miru-b-400x120.png"
      />

      <MainText>
      
      </MainText>

      <SubText>
      </SubText>
    </Wrapper>
  );
};

export default DefaultPage;

