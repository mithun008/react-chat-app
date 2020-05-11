import React, { Component } from 'react'
import ChatInput from './ChatInput'
import ChatMessage from './ChatMessage'


const URL = 'REPLACE_WITH_WebSocketURI'


class Chat extends Component {
  state = {
    name: 'Bob',
    messages: [],
  }

  ws = new WebSocket(URL)

  componentDidMount() {
    this.ws.onopen = () => {
      // on connecting, do nothing but log it to the console
      console.log('connected')
    }

    this.ws.onmessage = evt => {
      // on receiving a message, add it to the list of messages
      console.log('Message received from server :' + evt.data);
      const msgPayload = JSON.parse(evt.data);
      const message = {};
      console.log('Name is ' + msgPayload.name);

      //const message = JSON.parse(evt.data)
      message.data = msgPayload.data;
      message.name = msgPayload.name;
      console.log('Updated...' + JSON.stringify(message));
      this.addMessage(message)
    }

    this.ws.onclose = () => {
      console.log('disconnected')
      // automatically try to reconnect on connection loss
      this.setState({
        ws: new WebSocket(URL),
      })
    }
  }

  addMessage = message =>
    this.setState(state => ({ messages: [message, ...state.messages] }))

  submitMessage = messageString => {
    // on submitting the ChatInput form, send the message, add it to the list and reset the input
    const message = { name: this.state.name, data: messageString }
    message.message = 'sendmessage';
    console.log(JSON.stringify(message));
    //const messageToAPI = '{"message":"sendmessage", "data":'+'"'+JSON.stringify(message)+'"}';
    //this.ws.send(JSON.stringify(message))

    //console.log(message);
    this.ws.send(JSON.stringify(message))
    this.addMessage(message)

  }

  render() {
    return (
      <div>
        <label htmlFor="name">
          Name:&nbsp;
          <input
            type="text"
            id={'name'}
            placeholder={'Enter your name...'}
            value={this.state.name}
            onChange={e => this.setState({ name: e.target.value })}
          />
        </label>
        <ChatInput
          ws={this.ws}
          onSubmitMessage={messageString => this.submitMessage(messageString)}
        />
        {this.state.messages.map((message, index) =>
          <ChatMessage
            key={index}
            message={message.data}
            name={message.name}
          />,
        )}
      </div>
    )
  }
}

export default Chat