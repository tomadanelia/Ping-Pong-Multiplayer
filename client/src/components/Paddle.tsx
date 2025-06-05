import './Paddle.css'; // Import the CSS file

interface PaddleProps {
    x: number;
    y: number;
    width: number;
    height: number;
}

function Paddle({ x, y, width, height }: PaddleProps) {
    const paddleStyle: React.CSSProperties = {
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
    };

    return (
        <div style={paddleStyle} className="paddle"></div>
    );
}

export default Paddle;