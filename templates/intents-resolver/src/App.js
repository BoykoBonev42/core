import { useContext, useEffect, useState } from 'react';
import { GlueContext } from '@glue42/react-hooks';
import theme from '@glue42/theme';

const App = () => {
  const glue = useContext(GlueContext);

  const [handlers, setHandlers] = useState([]);

  const setTheme = async () => {
    const theme = await glue.themes?.getCurrent();

    if (!theme) return;

    const html = document.querySelector('html');

    html.classList.add(theme.name);
  };

  const setWindowBounds = async () => {
    const html = document.querySelector('html');
    const height = html.getBoundingClientRect().height;

    if (height > 800) {
      return;
    }

    const myWin = glue.windows.my();

    if (window.glue42core) {
      return myWin.moveResize({ height: height + 100, width: 400 });
    }

    return myWin.resizeTo(undefined, height + 50);
  };

  const getHandlerTitle = (handler) => {
    // Handler may not have application name if it's started using glue.windows.open => get the title using WindowsAPI
    if (!handler.applicationName) {
      const winDef = glue.windows.findById(handler.instanceId);

      return winDef.name;
    }

    const app = glue.appManager.application(handler.applicationName);

    // App can be undefined if it's an iframe
    return app ? app.title || app.name : handler.applicationName;
  };

  const subscribeOnHandlerAdded = () => {
    return glue.intents.resolver.onHandlerAdded((handler) => {
      setHandlers((handlers) => {
        const handlerTitle = getHandlerTitle(handler);

        const parsedHandler = { ...handler, id: handler.instanceId || handler.applicationName, title: handlerTitle };

        return [...handlers, parsedHandler];
      })
    });
  };

  const subscribeOnHandlerRemoved = () => {
    return glue.intents.resolver.onHandlerRemoved((removedHandler) => {
      setHandlers((handlers) => {
        const removedHandlerWithId = { ...removedHandler, id: removedHandler.type === "app" ? removedHandler.applicationName : removedHandler.instanceId };

        return handlers.filter(handler => handler.id !== removedHandlerWithId.id);
      });
    });
  };

  const submitHandler = async (id) => {
    const chosenHandler = handlers.find((handler) => handler.id === id);

    await glue.intents.resolver.sendResponse(chosenHandler);
  };

  useEffect(() => {
    setTheme();
    subscribeOnHandlerAdded();
    subscribeOnHandlerRemoved();
  }, []);

  useEffect(() => {
    setWindowBounds();
  }, [handlers]);

  return (
    <div className='container-fluid'>
      {!glue && (
        <div className='tick42-loader active'>
          <div className='tick42-loader-text'>Loading ...</div>
        </div>
      )}

      <div className='row mt-3' style={{ cursor: "default" }}>
        <div className='col'>
          <h3 style={{ margin: 0 }}>Choose an app to {typeof glue.intents.resolver.intent === "object" ? glue.intents.resolver.intent.intent : glue.intents.resolver.intent}</h3>
        </div>
      </div>

      {
        !!handlers.filter((handler) => !handler.instanceId).length && (
          <>
            <div className='row mt-3'>
              <div className='col'>
                <h5>Start new:</h5>
              </div>
            </div>

            <ul className='list-group'>
              {handlers
                .filter((handler) => !handler.instanceId)
                .map((handler) => (
                  <li
                    className='list-group-item list-group-item-action d-flex justify-content-between align-items-center'
                    key={handler.id}
                    onClick={() => submitHandler(handler.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <span>
                      {handler.applicationIcon ? (
                        <img
                          src={'data:image/png;base64, ' + handler.applicationIcon}
                          alt=''
                          style={{ width: 16 }}
                          className='mr-3'
                        ></img>
                      ) : (
                        <i className='icon-app mr-3'></i>
                      )}
                      {handler.title || handler.applicationName}
                    </span>
                    <span className={`badge badge-info badge-pill`}>app</span>
                  </li>
                ))}
            </ul>
          </>
        )
      }

      {
        !!handlers.filter((handler) => handler.instanceId).length && (
          <>
            <div className='row mt-3'>
              <div className='col'>
                <h5>Use already running:</h5>
              </div>
            </div>

            <ul className='list-group'>
              {handlers
                .filter((handler) => handler.instanceId)
                .map((handler) => (
                  <li
                    className='list-group-item list-group-item-action d-flex justify-content-between align-items-center'
                    key={handler.id}
                    onClick={() => submitHandler(handler.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <span>
                      {handler.applicationIcon ? (
                        <img
                          src={'data:image/png;base64, ' + handler.applicationIcon}
                          alt=''
                          style={{ width: 16 }}
                          className='mr-3'
                        ></img>
                      ) : (
                        <i className='icon-app mr-3'></i>
                      )}
                      {handler.title || handler.applicationName}
                    </span>
                    <span className={`badge badge-secondary badge-pill`}>inst</span>
                  </li>
                ))}
            </ul>
          </>
        )
      }
    </div >
  );
};

export default App;
