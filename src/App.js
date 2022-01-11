import React, { useReducer } from "react";
import ReactDOM from "react-dom";
import "react-virtualized/styles.css";
import { WindowScroller, List, AutoSizer } from "react-virtualized";
import styled from "@emotion/styled";
import { Global, css } from "@emotion/core";
import { colors } from "@atlaskit/theme";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import Title from "./title";
import { reorderQuoteMap } from "./reorder";
import QuoteItem from "./quote-item";
import { grid, borderRadius } from "./constants";
import { getBackgroundColor } from "./quote-list";
import QuoteCountSlider from "./quote-count-chooser";
import { generateQuoteMap } from "./data";

const Container = styled.div`
  display: flex;
  flex-direction: column;
`;

// Using a higher order function so that we can look up the quotes data to retrieve
// our quote from within the rowRender function
const getRowRender = quotes => ({ index, style }) => {
  const quote = quotes[index];

  // We are rendering an extra item for the placeholder
  // Do do this we increased our data set size to include one 'fake' item
  if (!quote) {
    return null;
  }

  // Faking some nice spacing around the items
  const patchedStyle = {
    ...style,
    left: style.left + grid,
    top: style.top + grid,
    width: `calc(${style.width} - ${grid * 2}px)`,
    height: style.height - grid
  };

  return (
    <Draggable draggableId={quote.id} index={index} key={quote.id}>
      {(provided, snapshot) => (
        <QuoteItem
          provided={provided}
          quote={quote}
          isDragging={snapshot.isDragging}
          style={patchedStyle}
        />
      )}
    </Draggable>
  );
};

const ColumnContainer = styled.div`
  border-top-left-radius: ${borderRadius}px;
  border-top-right-radius: ${borderRadius}px;
  background-color: ${colors.N30};
  flex-shrink: 0;
  margin: ${grid}px;
  display: flex;
`;

const Column = React.memo(function Column(props) {
  const { columnId, quotes } = props;

  return (
    <ColumnContainer>
      <Title>{columnId}</Title>
      <Droppable
        droppableId={columnId}
        mode="virtual"
        renderClone={(provided, snapshot, rubric) => (
          <QuoteItem
            provided={provided}
            isDragging={snapshot.isDragging}
            quote={quotes[rubric.source.index]}
            style={{ margin: 0 }}
          />
        )}
      >
        {(droppableProvided, snapshot) => {
          const itemCount = snapshot.isUsingPlaceholder
            ? quotes.length + 1
            : quotes.length;

          return (
            <List
              autoHeight
              height={500}
              rowCount={itemCount}
              rowHeight={110}
              width={500}
              // scrollTop={scrollTop}
              ref={ref => {
                // react-virtualized has no way to get the list's ref that I can so
                // So we use the `ReactDOM.findDOMNode(ref)` escape hatch to get the ref
                if (ref) {
                  // eslint-disable-next-line react/no-find-dom-node
                  const whatHasMyLifeComeTo = ReactDOM.findDOMNode(ref);
                  if (whatHasMyLifeComeTo instanceof HTMLElement) {
                    droppableProvided.innerRef(whatHasMyLifeComeTo);
                  }
                }
              }}
              style={{
                backgroundColor: getBackgroundColor(
                  snapshot.isDraggingOver,
                  Boolean(snapshot.draggingFromThisWith)
                ),
                transition: "background-color 0.2s ease"
              }}
              rowRenderer={getRowRender(quotes)}
            />
          );
        }}
      </Droppable>
    </ColumnContainer>
  );
});

function getColumnKeys(quoteMap) {
  return Object.keys(quoteMap).sort();
}

function getInitialState() {
  const itemCount = 10000;
  const quoteMap = generateQuoteMap(itemCount);
  const columnKeys = getColumnKeys(quoteMap);
  return {
    itemCount,
    quoteMap,
    columnKeys
  };
}

function reducer(state, action) {
  if (action.type === "CHANGE_COUNT") {
    const quoteMap = generateQuoteMap(action.payload);
    return {
      itemCount: action.payload,
      quoteMap,
      columnKeys: getColumnKeys(quoteMap)
    };
  }
  if (action.type === "REORDER") {
    return {
      itemCount: state.itemCount,
      quoteMap: action.payload,
      columnKeys: getColumnKeys(action.payload)
    };
  }

  return state;
}

// eslint-disable-next-line no-unused-vars
function Board(props) {
  const [state, dispatch] = useReducer(reducer, undefined, getInitialState);

  function onDragEnd(result) {
    if (!result.destination) {
      return;
    }
    const source = result.source;
    const destination = result.destination;

    // did not move anywhere - can bail early
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const updated = reorderQuoteMap({
      quoteMap: state.quoteMap,
      source,
      destination
    });

    dispatch({ type: "REORDER", payload: updated.quoteMap });
  }

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <Container>
          {state.columnKeys.map(key => {
            const quotes = state.quoteMap[key];

            return <Column key={key} quotes={quotes} columnId={key} />;
          })}
        </Container>
        <QuoteCountSlider
          library="react-virtualized"
          count={state.itemCount}
          onCountChange={count =>
            dispatch({ type: "CHANGE_COUNT", payload: count })
          }
        />
      </DragDropContext>
      <Global
        styles={css`
          body {
            background: ${colors.B200} !important;
          }
        `}
      />
    </>
  );
}
export default Board;
