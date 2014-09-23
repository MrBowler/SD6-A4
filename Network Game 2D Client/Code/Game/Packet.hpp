#ifndef include_Packet
#define include_Packet
#pragma once

//-----------------------------------------------------------------------------------------------
enum
{
	PACKET_STATE_NONE,
	PACKET_STATE_ADD,
	PACKET_STATE_REMOVE,
	PACKET_STATE_UPDATE,
};


//-----------------------------------------------------------------------------------------------
struct Packet
{
	unsigned char	m_packetID;
	unsigned char	r;
	unsigned char	g;
	unsigned char	b;
	float			x;
	float			y;
};


#endif // include_Packet