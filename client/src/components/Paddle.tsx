import './Paddle.css'; // Import the CSS file

interface PaddleProps {
    x: number;
    y: number;
    width: number;
    height: number;
    color?: string;
}

function Paddle({ x, y, width, height, color = 'white' }: PaddleProps) {
    const paddleStyle: React.CSSProperties = {
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: color,
    };

    return (
        <div style={paddleStyle} className="paddle"></div>
    );
}

export default Paddle;