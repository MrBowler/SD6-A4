//-----------------------------------------------------------------------------------------------
var UDP_PORT_NUMBER = 5000;
var PACKET_STATE_NONE = 0;
var PACKET_STATE_ADD = 1;
var	PACKET_STATE_REMOVE = 2;
var	PACKET_STATE_UPDATE = 3;
var PACKET_SIZE_BYTES = 12;
var SECONDS_BEFORE_DISCONNECT = 5;
var SECONDS_BETWEEN_SEND_UPDATES = 0.1;
var MILLISECONDS_BEFORE_DISCONNECT = SECONDS_BEFORE_DISCONNECT * 1000;
var MILLISECONDS_BETWEEN_SEND_UPDATES = SECONDS_BETWEEN_SEND_UPDATES * 1000;


//-----------------------------------------------------------------------------------------------
var Map = require('../Engine/collection').Map;
var dgram = require('dgram');
var g_clients = new Map();
var g_players = new Map();
var g_clientInfo = new Map();


//-----------------------------------------------------------------------------------------------
var GetPlayerColorByID = function( playerID )
{
	var color = {};
	if( playerID === 0 )
	{
		color.r = 255;
		color.g = 0;
		color.b = 0;
	}
	else if( playerID === 1 )
	{
		color.r = 0;
		color.g = 255;
		color.b = 0;
	}
	else if( playerID === 2 )
	{
		color.r = 0;
		color.g = 0;
		color.b = 255;
	}
	else if( playerID === 3 )
	{
		color.r = 255;
		color.g = 255;
		color.b = 0;
	}
	else if( playerID === 4 )
	{
		color.r = 255;
		color.g = 0;
		color.b = 255;
	}
	else if( playerID === 5 )
	{
		color.r = 0;
		color.g = 255;
		color.b = 255;
	}
	else if( playerID === 6 )
	{
		color.r = 255;
		color.g = 255;
		color.b = 255;
	}
	else
	{
		color.r = 0;
		color.g = 0;
		color.b = 0;
	}
	
	return color;
}


//-----------------------------------------------------------------------------------------------
var ParsePacket = function( buff )
{
	var packet = {};
	var byteOffset = 0;
	
	packet.id = buff.readUInt8( byteOffset );
	
	if( packet.id !== PACKET_STATE_NONE && packet.id !== PACKET_STATE_ADD && packet.id !== PACKET_STATE_REMOVE && packet.id !== PACKET_STATE_UPDATE )
	{
		packet = null;
	}
	else
	{
		byteOffset += 1;
		packet.r = buff.readUInt8( byteOffset );
	
		byteOffset += 1;
		packet.g = buff.readUInt8( byteOffset );
	
		byteOffset += 1;
		packet.b = buff.readUInt8( byteOffset );
	
		packet.playerID = packet.r + ',' + packet.g + ',' + packet.b;
		
		byteOffset += 1;
		packet.x  = buff.readFloatLE( byteOffset );
		
		byteOffset += 4;
		packet.y  = buff.readFloatLE( byteOffset );
	}
	
	return packet;
}


//-----------------------------------------------------------------------------------------------
var CreatePacket = function( id, r, g, b, x, y )
{
	var buff = new Buffer( 12 );
	var byteOffset = 0;
	
	buff.writeUInt8( id, byteOffset, 1 );
	
	byteOffset += 1;
	buff.writeUInt8( r, byteOffset, 1 );
	
	byteOffset += 1;
	buff.writeUInt8( g, byteOffset, 1 );
	
	byteOffset += 1;
	buff.writeUInt8( b, byteOffset, 1 );
	
	byteOffset += 1;
	buff.writeFloatLE( x, byteOffset, 4 );
	
	byteOffset += 4;
	buff.writeFloatLE( y, byteOffset, 4 );
	
	return buff;
}


//-----------------------------------------------------------------------------------------------
var SendUpdatesToClients = function()
{
	g_players.each( function( playerIter )
	{
		var player = playerIter.value();
		var updatePacket = CreatePacket( PACKET_STATE_UPDATE, player.r, player.g, player.b, player.x, player.y );
		g_clientInfo.each( function( clientIter )
		{
			var clientInfo = clientIter.value();
			var dgram = require('dgram');
			var client = dgram.createSocket( 'udp4' );
			client.send( updatePacket, 0, updatePacket.length, clientInfo.port, clientInfo.address, function( err, bytes ) { client.close(); } );
		});
	});
	
	setTimeout( SendUpdatesToClients, MILLISECONDS_BETWEEN_SEND_UPDATES );
}

setTimeout( SendUpdatesToClients, MILLISECONDS_BETWEEN_SEND_UPDATES );


//-----------------------------------------------------------------------------------------------
var CheckForClientTimeout = function()
{
	var currentTime = Date.now();
	var timedOutClients = [];
	
	timedOutClients = g_clients.filter( function(v){ return ( Date.now() - v.value() ) > MILLISECONDS_BEFORE_DISCONNECT; } );
	for( var clientIndex = 0; clientIndex < timedOutClients.length; ++clientIndex )
	{
		var client = timedOutClients[ clientIndex ].key();
		var player = g_players.get( client );
		g_clients.remove( client );
		g_players.remove( client );
		g_clientInfo.remove( client );
		SendPlayerRemoval( player );
		console.log( "Removed player at " + client );
	}
	
	setTimeout( CheckForClientTimeout, MILLISECONDS_BEFORE_DISCONNECT );
}

setTimeout( CheckForClientTimeout, MILLISECONDS_BEFORE_DISCONNECT );


//-----------------------------------------------------------------------------------------------
var AddPlayer = function( sender )
{
	var key = ( sender.address + ":" + sender.port );
	var playerColor = GetPlayerColorByID( g_players.size() );
	var packet = CreatePacket( PACKET_STATE_ADD, playerColor.r, playerColor.g, playerColor.b, 0.0, 0.0 );
	
	var dgram = require('dgram');
	var client = dgram.createSocket( 'udp4' );
	client.send( packet, 0, packet.length, sender.port, sender.address, function( err, bytes ) { client.close(); } );
	
	if( !g_clients.has( key ) )
	{
		console.log( 'Added player from ' + key );
	}
}


//-----------------------------------------------------------------------------------------------
var UpdatePlayer = function( updatePacket, sender )
{
	var key = ( sender.address + ":" + sender.port );
	var player = g_players.get( key );
	if( player === undefined )
	{
		player = {};
	}
	
	player.r = updatePacket.r;
	player.g = updatePacket.g;
	player.b = updatePacket.b;
	player.x = updatePacket.x;
	player.y = updatePacket.y;
	
	g_players.set( key, player );
}


//-----------------------------------------------------------------------------------------------
var SendPlayerRemoval = function( player )
{
	var removePacket = CreatePacket( PACKET_STATE_REMOVE, player.r, player.g, player.b, player.x, player.y );
	
	g_clientInfo.each( function( clientIter )
	{
		var clientInfo = clientIter.value();
		var dgram = require('dgram');
		var client = dgram.createSocket( 'udp4' );
		client.send( removePacket, 0, removePacket.length, clientInfo.port, clientInfo.address, function( err, bytes ) { client.close(); } );
	});
}


//-----------------------------------------------------------------------------------------------
var udpServer = dgram.createSocket( 'udp4' );
udpServer.bind( UDP_PORT_NUMBER );
udpServer.on( 'message', function( msg, sender )
{
	var key = ( sender.address + ":" + sender.port );
	var packet = ParsePacket( msg );
	if( packet === null )
	{
		return;
	}
	
	if( packet.id === PACKET_STATE_ADD )
	{
		AddPlayer( sender );
	}
	else if( packet.id === PACKET_STATE_UPDATE )
	{
		UpdatePlayer( packet, sender );
	}
	
	g_clients.set( key, Date.now() );
	g_clientInfo.set( key, sender );
});
