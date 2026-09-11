import React from 'react';
import { Card } from 'antd';
import styled from 'styled-components';

const StyledCard = styled(Card)`
  width: 70vw;
  max-width: 1100px;
  min-width: 320px;
  height: auto;

  margin: 12px 0;

  border: 1px solid #d7e4d5;
  border-left: 5px solid #397348;

  border-radius: 14px;

  background: rgba(255, 255, 255, 0.96);

  box-shadow:
    0 4px 12px rgba(38, 70, 42, 0.08);

  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;

  overflow: hidden;

  .ant-card-body {
    padding: 22px 26px;
  }

  &:hover {
    transform: translateY(-2px);

    border-color: #9bb89d;

    box-shadow:
      0 8px 22px rgba(38, 70, 42, 0.14);
  }

  /* =====================================
     TÍTULO DEL PRODUCTO
     ===================================== */

  h2 {
    margin: 0 0 18px 0;

    color: #23452b;

    font-size: 23px;
    font-weight: 700;

    letter-spacing: 0.2px;

    border-bottom: 1px solid #e4ece2;

    padding-bottom: 12px;
  }

  /* =====================================
     INFORMACIÓN
     ===================================== */

  p {
    margin: 9px 0;

    color: #4a574c;

    font-size: 15px;

    line-height: 1.5;
  }

  p strong {
    color: #315d39;
  }

  /* =====================================
     TAGS / FEFO / ESTADOS
     ===================================== */

  .ant-tag {
    margin-top: 5px;
    margin-bottom: 5px;

    padding: 4px 9px;

    border-radius: 7px;

    font-size: 13px;
  }
`;

export default StyledCard;

