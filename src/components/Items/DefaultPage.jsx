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
        src="https://cdn-icons-png.flaticon.com/512/6552/6552495.png"
        alt="Organizador de productos"
      />

      <MainText>
        Bienvenido a tu organizador de productos
      </MainText>

      <SubText>
        Seleccioná una categoría del menú para comenzar
      </SubText>
    </Wrapper>
  );
};

export default DefaultPage;

