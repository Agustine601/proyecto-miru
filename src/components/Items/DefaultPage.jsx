import React from 'react';
import styled from 'styled-components';
import logoMiru from '../../assets/logo-miru-b-400x120.png';

const Image = styled.img`
  width: 14rem;
  max-width: 80%;
  height: auto;
  margin: 1.5rem 0;
`;

const Wrapper = styled.div`
  width: 100%;
  min-height: 100%;
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
        src={logoMiru}
        alt="MIRÚ - Gestión Agrícola"
      />

      <MainText></MainText>

      <SubText></SubText>
    </Wrapper>
  );
};

export default DefaultPage;