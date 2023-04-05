import React, {
  FC,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import styled, { css } from 'styled-components';
import { AppSelectionContext, useAppContext } from '../../hooks/appContext';
import { Label3 } from '../Text';

interface ActionProps {
  icon: React.ReactNode;
  title: string;
  action: () => void;
}

const Text = styled(Label3)`
  color: ${(props) => props.theme.textSecondary};
`;

const Button = styled.div`
  width: 44px;
  height: 44px;
  border-radius: ${(props) => props.theme.cornerFull};
  color: ${(props) => props.theme.textPrimary};
  background-color: ${(props) => props.theme.backgroundContent};
  display: flex;
  justify-content: center;
  align-items: center;
`;

const Block = styled.div<{ ios: boolean; isHover?: boolean }>`
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  min-width: 55px;
  max-width: 70px;
  text-align: center;

  user-select: none;

  ${(props) => {
    if (props.ios) {
      if (props.isHover) {
        return css`
          ${Text} {
            color: ${props.theme.textPrimary};
            transition: color 0.1s ease;
          }
          ${Button} {
            background-color: ${props.theme.backgroundContentTint};
            transition: background-color 0.1s ease;
          }
        `;
      }
      return undefined;
    } else {
      return css`
        &:hover ${Text} {
          color: ${props.theme.textPrimary};
          transition: color 0.1s ease;
        }
        &:hover ${Button} {
          background-color: ${props.theme.backgroundContentTint};
          transition: background-color 0.1s ease;
        }
      `;
    }
  }}
`;

export const Action: FC<ActionProps> = ({ icon, title, action }) => {
  const selection = useContext(AppSelectionContext);
  const { ios } = useAppContext();
  const [isHover, setHover] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (selection && ref.current && ref.current.contains(selection as Node)) {
      setHover(true);
    } else {
      setHover(false);
    }
  }, [ref.current, selection, setHover]);

  return (
    <Block ref={ref} onClick={action} isHover={isHover} ios={ios}>
      <Button>{icon}</Button>
      <Text>{title}</Text>
    </Block>
  );
};

export const ActionsRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 2rem;
`;
